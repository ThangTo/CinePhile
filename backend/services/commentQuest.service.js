const Comment = require('../models/comment.model');
const questService = require('./quest.service');

async function grantCommentQuestProgress(commentId) {
  if (!commentId) {
    return { awarded: false, reason: 'missing_comment_id' };
  }

  const grantedAt = new Date();
  const comment = await Comment.findOneAndUpdate(
    {
      _id: commentId,
      status: 'allowed',
      questProgressGrantedAt: null,
    },
    {
      $set: { questProgressGrantedAt: grantedAt },
    },
    { new: true }
  );

  if (!comment) {
    return { awarded: false, reason: 'not_eligible' };
  }

  try {
    await questService.checkAndUpdateProgress(comment.userId, {
      type: 'comment',
      movieId: comment.movieId,
    });

    return { awarded: true, comment };
  } catch (error) {
    await Comment.updateOne(
      {
        _id: comment._id,
        questProgressGrantedAt: grantedAt,
      },
      {
        $set: { questProgressGrantedAt: null },
      }
    );

    throw error;
  }
}

module.exports = {
  grantCommentQuestProgress,
};
