const mongoose = require('mongoose');
const {
  QUEST_TYPES,
  QUEST_SELECTION_MODES,
} = require('../constants/quest.constants');

const questConfigSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      unique: true,
      enum: QUEST_TYPES,
    },
    selectionMode: {
      type: String,
      required: true,
      enum: QUEST_SELECTION_MODES,
      default: 'fixed',
    },
    fixedQuestIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuestDefinition',
      },
    ],
    randomPoolQuestIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuestDefinition',
      },
    ],
    randomCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    completionBonusCoins: {
      type: Number,
      default: 0,
      validate: {
        validator(v) {
          return Number.isInteger(v) && v >= 0 && v <= 500 && v % 10 === 0;
        },
        message: 'completionBonusCoins must be a multiple of 10, min 0, max 500',
      },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('QuestConfig', questConfigSchema);
