import { randomUUID } from 'crypto';
import { mkdir, rm, writeFile } from 'fs/promises';
import path from 'path';
import { FastifyPluginAsync } from 'fastify';
import jwt from 'jsonwebtoken';
import { getSequelize } from '../config/database';
import { Document, InvestorProfile, KYCRecord, Organization, User } from '../db/models';

type RegistrationRole = 'institutional' | 'insurer' | 'underwriter' | 'claims' | 'broker' | 'admin';
type RegistrationApproach = 'invitation-code' | 'request-access' | 'business-details';
type AccountAccessMethod = 'organization-email' | 'username-password' | 'social';
type SocialProvider = 'gmail' | 'facebook' | 'microsoft';

type RegistrationDocumentInput = {
  documentType: string;
  fileName: string;
  mimeType?: string | null;
  required?: boolean;
  contentBase64: string;
};

type RegistrationPayload = {
  selectedRole: RegistrationRole;
  organizationName?: string | null;
  organizationReference?: string | null;
  registrationApproach?: RegistrationApproach | null;
  accountMethod?: AccountAccessMethod | null;
  socialProvider?: SocialProvider | null;
  organizationEmail?: string | null;
  username?: string | null;
  businessDetails?: Record<string, unknown> | null;
  fullName: string;
  dob: string;
  nationality: string;
  residentialAddress: string;
  phoneNumber: string;
  emailAddress: string;
  livenessCompleted?: boolean;
  documents: RegistrationDocumentInput[];
};

type StoredDocument = {
  documentId: number;
  documentType: string;
  fileName: string;
  storagePath: string;
  required: boolean;
};

const roleMap: Record<RegistrationRole, 'investor' | 'insurer' | 'analyst' | 'admin'> = {
  institutional: 'investor',
  insurer: 'insurer',
  underwriter: 'analyst',
  claims: 'analyst',
  broker: 'analyst',
  admin: 'admin',
};

const organizationTypeByRole: Record<RegistrationRole, 'investor_fund' | 'insurer' | 'admin'> = {
  institutional: 'investor_fund',
  insurer: 'insurer',
  underwriter: 'insurer',
  claims: 'insurer',
  broker: 'insurer',
  admin: 'admin',
};

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: 'Registration', lastName: 'User' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'User' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, '_') || 'document.bin';
}

function resolveStorageRoot(registrationId: string): string {
  return path.resolve(process.cwd(), 'storage', 'registration-documents', registrationId);
}

function resolveOrganizationIdentifier(payload: RegistrationPayload): string | null {
  const organizationIdentifier =
    payload.organizationReference?.trim() ||
    payload.organizationName?.trim() ||
    (typeof payload.businessDetails?.legalName === 'string' ? payload.businessDetails.legalName.trim() : '');

  return organizationIdentifier || null;
}

export const registrationRoute: FastifyPluginAsync = async (app) => {
  app.post<{ Body: RegistrationPayload }>('/registration/complete', async (req, reply) => {
    const payload = req.body;

    if (!payload?.selectedRole) {
      return reply.code(400).send({ error: 'missing_selected_role' });
    }

    if (!payload.fullName?.trim() || !payload.emailAddress?.trim()) {
      return reply.code(400).send({ error: 'missing_identity_fields' });
    }

    if (!Array.isArray(payload.documents) || payload.documents.length === 0) {
      return reply.code(400).send({ error: 'missing_documents' });
    }

    const registrationId = randomUUID();
    const storageRoot = resolveStorageRoot(registrationId);
    await mkdir(storageRoot, { recursive: true });

    try {
      const storedDocuments: Array<StoredDocument & { absolutePath: string }> = [];
      for (const documentInput of payload.documents) {
        const safeFileName = `${Date.now()}-${randomUUID().slice(0, 8)}-${sanitizeFileName(documentInput.fileName)}`;
        const relativePath = path.posix.join('storage', 'registration-documents', registrationId, safeFileName);
        const absolutePath = path.join(storageRoot, safeFileName);
        await writeFile(absolutePath, Buffer.from(documentInput.contentBase64, 'base64'));

        storedDocuments.push({
          documentId: 0,
          documentType: documentInput.documentType,
          fileName: documentInput.fileName,
          storagePath: relativePath,
          required: documentInput.required ?? true,
          absolutePath,
        });
      }

      const sequelize = getSequelize();
      const result = await sequelize.transaction(async (transaction) => {
        let organizationId: number | null = null;
        const organizationIdentifier = resolveOrganizationIdentifier(payload);
        if (organizationIdentifier) {
          let organization = await Organization.findOne({ where: { name: organizationIdentifier }, transaction });
          if (!organization) {
            organization = await Organization.create(
              {
                name: organizationIdentifier,
                type: organizationTypeByRole[payload.selectedRole],
                submissionBoardConfig: null,
              },
              { transaction },
            );
          }
          organizationId = organization.id;
        }

        const { firstName, lastName } = splitFullName(payload.fullName);
        const createdUser = await User.create(
          {
            organizationId,
            email: payload.emailAddress.trim().toLowerCase(),
            passwordHash: `registration:${registrationId}`,
            role: roleMap[payload.selectedRole],
            firstName,
            lastName,
            isActive: true,
          },
          { transaction },
        );

        const createdDocuments: StoredDocument[] = [];
        for (const documentInput of storedDocuments) {
          const createdDocument = await Document.create(
            {
              entityType: 'User',
              entityId: createdUser.id,
              type: documentInput.documentType,
              url: documentInput.storagePath,
              uploadedByUserId: createdUser.id,
              uploadedAt: new Date(),
            },
            { transaction },
          );

          createdDocuments.push({
            documentId: createdDocument.id,
            documentType: documentInput.documentType,
            fileName: documentInput.fileName,
            storagePath: documentInput.storagePath,
            required: documentInput.required,
          });
        }

        let investorProfileId: number | null = null;
        if (roleMap[payload.selectedRole] === 'investor') {
          const investorProfile = await InvestorProfile.create(
            {
              userId: createdUser.id,
              accreditationStatus: 'pending',
              kycStatus: 'pending',
              riskPreferences: null,
            },
            { transaction },
          );

          investorProfileId = investorProfile.id;

          await KYCRecord.create(
            {
              investorProfileId: investorProfile.id,
              provider: 'registration-intake',
              verificationLevel: payload.livenessCompleted ? 'document-plus-liveness' : 'document-only',
              status: 'pending',
              documentsJson: createdDocuments.map((document) => ({
                documentId: document.documentId,
                documentType: document.documentType,
                fileName: document.fileName,
                storagePath: document.storagePath,
                required: document.required,
              })),
              expirationDate: null,
              verifiedAt: null,
            },
            { transaction },
          );
        }

        return {
          user: createdUser,
          investorProfileId,
          documents: createdDocuments,
        };
      });

      const authToken = jwt.sign(
        {
          userId: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          organizationId: result.user.organizationId,
        },
        JWT_SECRET,
      );

      return reply.code(201).send({
        registrationId,
        authToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          organizationId: result.user.organizationId,
        },
        investorProfileId: result.investorProfileId,
        documents: result.documents,
      });
    } catch (error) {
      await rm(storageRoot, { recursive: true, force: true }).catch(() => undefined);
      throw error;
    }
  });
};

export default registrationRoute;