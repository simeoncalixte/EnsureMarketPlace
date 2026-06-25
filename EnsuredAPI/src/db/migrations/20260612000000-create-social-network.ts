import { DataTypes, Op, QueryInterface } from 'sequelize';

/**
 * Social network foundation: professional profiles, the connection graph,
 * feed posts (likes/comments), direct conversations with messages that can
 * share submissions/files, per-user external messaging integrations
 * (WhatsApp/Telegram), and explicit cross-tenant submission read grants.
 */

const id = { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false };
const timestamps = {
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
};

function userFk(allowNull = false, onDelete: 'CASCADE' | 'SET NULL' = 'CASCADE') {
  return {
    type: DataTypes.INTEGER,
    allowNull,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete,
  };
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  await context.sequelize.transaction(async (transaction) => {
    await context.createTable(
      'user_profiles',
      {
        id,
        userId: { ...userFk(), unique: true },
        headline: { type: DataTypes.STRING(160), allowNull: true },
        bio: { type: DataTypes.TEXT, allowNull: true },
        avatarUrl: { type: DataTypes.STRING, allowNull: true },
        location: { type: DataTypes.STRING, allowNull: true },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'connections',
      {
        id,
        requesterId: userFk(),
        addresseeId: userFk(),
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
        respondedAt: { type: DataTypes.DATE, allowNull: true },
        ...timestamps,
      },
      { transaction },
    );
    await context.addIndex('connections', ['requesterId', 'addresseeId'], {
      name: 'connections_requester_addressee_uniq',
      unique: true,
      transaction,
    });
    await context.addIndex('connections', ['addresseeId', 'status'], {
      name: 'connections_addressee_status_idx',
      transaction,
    });

    await context.createTable(
      'posts',
      {
        id,
        authorId: userFk(),
        content: { type: DataTypes.TEXT, allowNull: false },
        visibility: { type: DataTypes.STRING, allowNull: false, defaultValue: 'public' },
        attachmentsJson: { type: DataTypes.JSONB, allowNull: true },
        deletedAt: { type: DataTypes.DATE, allowNull: true },
        ...timestamps,
      },
      { transaction },
    );
    await context.addIndex('posts', ['authorId', 'createdAt'], {
      name: 'posts_author_created_idx',
      transaction,
    });

    await context.createTable(
      'post_likes',
      {
        id,
        postId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'posts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        userId: userFk(),
        ...timestamps,
      },
      { transaction },
    );
    await context.addIndex('post_likes', ['postId', 'userId'], {
      name: 'post_likes_post_user_uniq',
      unique: true,
      transaction,
    });

    await context.createTable(
      'post_comments',
      {
        id,
        postId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'posts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        authorId: userFk(),
        body: { type: DataTypes.TEXT, allowNull: false },
        ...timestamps,
      },
      { transaction },
    );
    await context.addIndex('post_comments', ['postId', 'createdAt'], {
      name: 'post_comments_post_created_idx',
      transaction,
    });

    await context.createTable(
      'conversations',
      {
        id,
        kind: { type: DataTypes.STRING, allowNull: false, defaultValue: 'direct' },
        lastMessageAt: { type: DataTypes.DATE, allowNull: true },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'conversation_participants',
      {
        id,
        conversationId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'conversations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        userId: userFk(),
        lastReadAt: { type: DataTypes.DATE, allowNull: true },
        ...timestamps,
      },
      { transaction },
    );
    await context.addIndex('conversation_participants', ['conversationId', 'userId'], {
      name: 'conversation_participants_conversation_user_uniq',
      unique: true,
      transaction,
    });
    await context.addIndex('conversation_participants', ['userId'], {
      name: 'conversation_participants_user_idx',
      transaction,
    });

    await context.createTable(
      'social_messages',
      {
        id,
        conversationId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'conversations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        senderId: userFk(),
        kind: { type: DataTypes.STRING, allowNull: false, defaultValue: 'text' },
        body: { type: DataTypes.TEXT, allowNull: true },
        submissionId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'submissions', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        submissionFileId: { type: DataTypes.INTEGER, allowNull: true },
        externalProvider: { type: DataTypes.STRING, allowNull: true },
        externalMessageId: { type: DataTypes.STRING, allowNull: true },
        ...timestamps,
      },
      { transaction },
    );
    await context.addIndex('social_messages', ['conversationId', 'createdAt'], {
      name: 'social_messages_conversation_created_idx',
      transaction,
    });
    // Dedup inbound webhook deliveries (Telegram/Twilio retry on slow 200s).
    await context.addIndex('social_messages', ['externalProvider', 'externalMessageId'], {
      name: 'social_messages_external_uniq',
      unique: true,
      where: { externalMessageId: { [Op.ne]: null } },
      transaction,
    });

    await context.createTable(
      'user_messaging_integrations',
      {
        id,
        userId: userFk(),
        provider: { type: DataTypes.STRING, allowNull: false },
        configJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
        verificationCode: { type: DataTypes.STRING, allowNull: true },
        verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        verifiedAt: { type: DataTypes.DATE, allowNull: true },
        ...timestamps,
      },
      { transaction },
    );
    await context.addIndex('user_messaging_integrations', ['userId', 'provider'], {
      name: 'user_messaging_integrations_user_provider_uniq',
      unique: true,
      transaction,
    });

    await context.createTable(
      'submission_shares',
      {
        id,
        submissionId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'submissions', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        grantedToUserId: userFk(),
        grantedByUserId: userFk(),
        messageId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'social_messages', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        ...timestamps,
      },
      { transaction },
    );
    await context.addIndex('submission_shares', ['submissionId', 'grantedToUserId'], {
      name: 'submission_shares_submission_grantee_uniq',
      unique: true,
      transaction,
    });
    await context.addIndex('submission_shares', ['grantedToUserId'], {
      name: 'submission_shares_grantee_idx',
      transaction,
    });
  });
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  await context.sequelize.transaction(async (transaction) => {
    for (const table of [
      'submission_shares',
      'user_messaging_integrations',
      'social_messages',
      'conversation_participants',
      'conversations',
      'post_comments',
      'post_likes',
      'posts',
      'connections',
      'user_profiles',
    ]) {
      await context.dropTable(table, { transaction });
    }
  });
}
