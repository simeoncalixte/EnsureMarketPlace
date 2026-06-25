import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';
import { signatureCaptureTypes, signatureRequestStatuses, signatureStatuses } from './constants';

/**
 * Standalone signature domain — the platform's signature COLLECTION POINT.
 *
 * Deliberately entity-agnostic and decoupled: a request references whatever it is
 * collecting signatures for by an OPAQUE (subjectType, subjectId) pair — a plain
 * label + id, NOT a foreign key — so this domain imports no other domain and no
 * other domain has to be imported here. A quote, policy, legal document, or
 * anything else can collect signatures through it without coupling.
 *
 * Integrity is provided by Node's built-in `crypto` (see ../../signature/logic),
 * not a third-party e-sign library: each completed signature stores a
 * tamper-evident HMAC `proof` over the document hash + signer + mark + timestamp.
 */

export class SignatureRequest extends Model<
  InferAttributes<SignatureRequest>,
  InferCreationAttributes<SignatureRequest>
> {
  declare id: CreationOptional<number>;
  declare organizationId: number | null;
  /** Opaque label of what is being signed (e.g. 'quote_version'); not an FK. */
  declare subjectType: string;
  /** Opaque id of the subject record; not an FK (keeps the domain decoupled). */
  declare subjectId: number;
  declare title: string | null;
  /** SHA-256 of the canonical document content the signers are attesting to. */
  declare documentHash: string;
  declare documentRef: string | null;
  declare status: CreationOptional<(typeof signatureRequestStatuses)[number]>;
  declare expiresAt: Date | null;
  declare completedAt: Date | null;
  declare createdByUserId: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Signature extends Model<InferAttributes<Signature>, InferCreationAttributes<Signature>> {
  declare id: CreationOptional<number>;
  declare signatureRequestId: number;
  declare signerName: string;
  declare signerEmail: string | null;
  declare signerRole: string | null;
  declare signingOrder: number | null;
  declare status: CreationOptional<(typeof signatureStatuses)[number]>;
  declare captureType: (typeof signatureCaptureTypes)[number] | null;
  /** The captured mark: typed name, base64 drawn image, or clickwrap assent text. */
  declare signatureData: string | null;
  /** Tamper-evident HMAC over the signed payload (see signature/logic). */
  declare proof: string | null;
  /** Snapshot of the document hash at the moment of signing. */
  declare signedDocumentHash: string | null;
  declare signedAt: Date | null;
  declare declinedReason: string | null;
  declare ipAddress: string | null;
  declare userAgent: string | null;
  declare signedByUserId: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initSignatureModels(sequelize: Sequelize): void {
  SignatureRequest.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      organizationId: { type: DataTypes.INTEGER, allowNull: true, field: 'organization_id' },
      subjectType: { type: DataTypes.STRING, allowNull: false, field: 'subject_type' },
      subjectId: { type: DataTypes.INTEGER, allowNull: false, field: 'subject_id' },
      title: { type: DataTypes.STRING, allowNull: true },
      documentHash: { type: DataTypes.STRING, allowNull: false, field: 'document_hash' },
      documentRef: { type: DataTypes.STRING, allowNull: true, field: 'document_ref' },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending', validate: { isIn: [signatureRequestStatuses] } },
      expiresAt: { type: DataTypes.DATE, allowNull: true, field: 'expires_at' },
      completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
      createdByUserId: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by_user_id' },
      createdAt: { type: DataTypes.DATE, allowNull: true, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE, allowNull: true, field: 'updated_at' },
    },
    {
      sequelize,
      modelName: 'SignatureRequest',
      tableName: 'signature_requests',
      underscored: true,
      indexes: [{ fields: ['subject_type', 'subject_id'] }, { fields: ['organization_id'] }],
    },
  );

  Signature.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      signatureRequestId: { type: DataTypes.INTEGER, allowNull: false, field: 'signature_request_id' },
      signerName: { type: DataTypes.STRING, allowNull: false, field: 'signer_name' },
      signerEmail: { type: DataTypes.STRING, allowNull: true, field: 'signer_email' },
      signerRole: { type: DataTypes.STRING, allowNull: true, field: 'signer_role' },
      signingOrder: { type: DataTypes.INTEGER, allowNull: true, field: 'signing_order' },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending', validate: { isIn: [signatureStatuses] } },
      captureType: { type: DataTypes.STRING, allowNull: true, field: 'capture_type', validate: { isIn: [signatureCaptureTypes] } },
      signatureData: { type: DataTypes.TEXT, allowNull: true, field: 'signature_data' },
      proof: { type: DataTypes.STRING, allowNull: true },
      signedDocumentHash: { type: DataTypes.STRING, allowNull: true, field: 'signed_document_hash' },
      signedAt: { type: DataTypes.DATE, allowNull: true, field: 'signed_at' },
      declinedReason: { type: DataTypes.STRING, allowNull: true, field: 'declined_reason' },
      ipAddress: { type: DataTypes.STRING, allowNull: true, field: 'ip_address' },
      userAgent: { type: DataTypes.STRING, allowNull: true, field: 'user_agent' },
      signedByUserId: { type: DataTypes.INTEGER, allowNull: true, field: 'signed_by_user_id' },
      createdAt: { type: DataTypes.DATE, allowNull: true, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE, allowNull: true, field: 'updated_at' },
    },
    {
      sequelize,
      modelName: 'Signature',
      tableName: 'signatures',
      underscored: true,
      indexes: [{ fields: ['signature_request_id'] }],
    },
  );
}
