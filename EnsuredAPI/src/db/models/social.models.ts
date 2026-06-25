import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export const connectionStatuses = ['pending', 'accepted', 'declined', 'blocked'] as const;
export const postVisibilities = ['public', 'connections'] as const;
export const conversationKinds = ['direct'] as const;
export const messageKinds = ['text', 'submission_share', 'attachment'] as const;
export const messagingProviders = ['whatsapp', 'telegram'] as const;

export type ConnectionStatus = (typeof connectionStatuses)[number];
export type MessagingProviderName = (typeof messagingProviders)[number];

export class UserProfile extends Model<InferAttributes<UserProfile>, InferCreationAttributes<UserProfile>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare headline: string | null;
  declare bio: string | null;
  declare avatarUrl: string | null;
  declare location: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Connection extends Model<InferAttributes<Connection>, InferCreationAttributes<Connection>> {
  declare id: CreationOptional<number>;
  declare requesterId: number;
  declare addresseeId: number;
  declare status: CreationOptional<ConnectionStatus>;
  declare respondedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Post extends Model<InferAttributes<Post>, InferCreationAttributes<Post>> {
  declare id: CreationOptional<number>;
  declare authorId: number;
  declare content: string;
  declare visibility: CreationOptional<(typeof postVisibilities)[number]>;
  declare attachmentsJson: Record<string, unknown>[] | null;
  declare deletedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class PostLike extends Model<InferAttributes<PostLike>, InferCreationAttributes<PostLike>> {
  declare id: CreationOptional<number>;
  declare postId: number;
  declare userId: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class PostComment extends Model<InferAttributes<PostComment>, InferCreationAttributes<PostComment>> {
  declare id: CreationOptional<number>;
  declare postId: number;
  declare authorId: number;
  declare body: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Conversation extends Model<InferAttributes<Conversation>, InferCreationAttributes<Conversation>> {
  declare id: CreationOptional<number>;
  declare kind: CreationOptional<(typeof conversationKinds)[number]>;
  declare lastMessageAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class ConversationParticipant extends Model<
  InferAttributes<ConversationParticipant>,
  InferCreationAttributes<ConversationParticipant>
> {
  declare id: CreationOptional<number>;
  declare conversationId: number;
  declare userId: number;
  declare lastReadAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class SocialMessage extends Model<InferAttributes<SocialMessage>, InferCreationAttributes<SocialMessage>> {
  declare id: CreationOptional<number>;
  declare conversationId: number;
  declare senderId: number;
  declare kind: CreationOptional<(typeof messageKinds)[number]>;
  declare body: string | null;
  declare submissionId: number | null;
  declare submissionFileId: number | null;
  declare externalProvider: MessagingProviderName | null;
  declare externalMessageId: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class UserMessagingIntegration extends Model<
  InferAttributes<UserMessagingIntegration>,
  InferCreationAttributes<UserMessagingIntegration>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare provider: MessagingProviderName;
  declare configJson: Record<string, unknown>;
  declare verificationCode: string | null;
  declare verified: CreationOptional<boolean>;
  declare verifiedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class SubmissionShare extends Model<InferAttributes<SubmissionShare>, InferCreationAttributes<SubmissionShare>> {
  declare id: CreationOptional<number>;
  declare submissionId: number;
  declare grantedToUserId: number;
  declare grantedByUserId: number;
  declare messageId: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initSocialModels(sequelize: Sequelize): void {
  UserProfile.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      headline: { type: DataTypes.STRING(160), allowNull: true },
      bio: { type: DataTypes.TEXT, allowNull: true },
      avatarUrl: { type: DataTypes.STRING, allowNull: true },
      location: { type: DataTypes.STRING, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'UserProfile', tableName: 'user_profiles', underscored: false },
  );

  Connection.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      requesterId: { type: DataTypes.INTEGER, allowNull: false },
      addresseeId: { type: DataTypes.INTEGER, allowNull: false },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending',
        validate: { isIn: [connectionStatuses] },
      },
      respondedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'Connection', tableName: 'connections', underscored: false },
  );

  Post.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      authorId: { type: DataTypes.INTEGER, allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false },
      visibility: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'public',
        validate: { isIn: [postVisibilities] },
      },
      attachmentsJson: { type: DataTypes.JSONB, allowNull: true },
      deletedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'Post', tableName: 'posts', underscored: false },
  );

  PostLike.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      postId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'PostLike', tableName: 'post_likes', underscored: false },
  );

  PostComment.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      postId: { type: DataTypes.INTEGER, allowNull: false },
      authorId: { type: DataTypes.INTEGER, allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'PostComment', tableName: 'post_comments', underscored: false },
  );

  Conversation.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      kind: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'direct',
        validate: { isIn: [conversationKinds] },
      },
      lastMessageAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'Conversation', tableName: 'conversations', underscored: false },
  );

  ConversationParticipant.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      conversationId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      lastReadAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'ConversationParticipant',
      tableName: 'conversation_participants',
      underscored: false,
    },
  );

  SocialMessage.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      conversationId: { type: DataTypes.INTEGER, allowNull: false },
      senderId: { type: DataTypes.INTEGER, allowNull: false },
      kind: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'text',
        validate: { isIn: [messageKinds] },
      },
      body: { type: DataTypes.TEXT, allowNull: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: true },
      submissionFileId: { type: DataTypes.INTEGER, allowNull: true },
      externalProvider: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: { isIn: [messagingProviders] },
      },
      externalMessageId: { type: DataTypes.STRING, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'SocialMessage', tableName: 'social_messages', underscored: false },
  );

  UserMessagingIntegration.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      provider: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isIn: [messagingProviders] },
      },
      configJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      verificationCode: { type: DataTypes.STRING, allowNull: true },
      verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      verifiedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'UserMessagingIntegration',
      tableName: 'user_messaging_integrations',
      underscored: false,
    },
  );

  SubmissionShare.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: false },
      grantedToUserId: { type: DataTypes.INTEGER, allowNull: false },
      grantedByUserId: { type: DataTypes.INTEGER, allowNull: false },
      messageId: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'SubmissionShare', tableName: 'submission_shares', underscored: false },
  );
}
