const mongoose = require('mongoose');
const {
  QUEST_TYPES,
  QUEST_CATEGORIES,
  QUEST_TARGET_METRICS,
  QUEST_SELECTION_MODES,
  QUEST_TIMEZONE,
} = require('../constants/quest.constants');

const snapshotQuestSchema = new mongoose.Schema(
  {
    sourceQuestDefinitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuestDefinition',
      required: true,
    },
    questId: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    icon: {
      type: String,
      default: 'fa-solid fa-star',
    },
    category: {
      type: String,
      required: true,
      enum: QUEST_CATEGORIES,
    },
    targetMetric: {
      type: String,
      required: true,
      enum: QUEST_TARGET_METRICS,
    },
    targetValue: {
      type: Number,
      required: true,
      min: 1,
    },
    targetMovieFilter: {
      type: String,
      default: 'any',
    },
    rewardCoins: {
      type: Number,
      required: true,
      min: 10,
      max: 500,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  },
);

const questPeriodSnapshotSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: QUEST_TYPES,
    },
    periodKey: {
      type: String,
      required: true,
    },
    timezone: {
      type: String,
      default: QUEST_TIMEZONE,
    },
    selectionMode: {
      type: String,
      required: true,
      enum: QUEST_SELECTION_MODES,
    },
    completionBonusCoins: {
      type: Number,
      default: 0,
      min: 0,
    },
    quests: {
      type: [snapshotQuestSchema],
      default: [],
    },
    configUpdatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

questPeriodSnapshotSchema.index({ type: 1, periodKey: 1 }, { unique: true });

module.exports = mongoose.model('QuestPeriodSnapshot', questPeriodSnapshotSchema);
