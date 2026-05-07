const mongoose = require('mongoose');

const batchMovieSchema = new mongoose.Schema(
  {
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      default: null,
      index: true,
    },
    movieName: {
      type: String,
      default: '',
    },
    slug: {
      type: String,
      default: '',
    },
    prioritySource: {
      type: String,
      default: 'unknown',
      index: true,
    },
    priorityRank: {
      type: Number,
      default: 0,
    },
    priorityViews: {
      type: Number,
      default: 0,
    },
    priorityWatchTime: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    episodeCount: {
      type: Number,
      default: 0,
    },
    pendingCount: {
      type: Number,
      default: 0,
    },
    approvedCount: {
      type: Number,
      default: 0,
    },
    detectedCount: {
      type: Number,
      default: 0,
    },
    state: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'skipped'],
      default: 'pending',
      index: true,
    },
    resultType: {
      type: String,
      enum: ['none', 'detected', 'no_match', 'completed', 'failed', 'skipped'],
      default: 'none',
      index: true,
    },
    jobId: {
      type: String,
      default: null,
      index: true,
    },
    queueBackend: {
      type: String,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    selectionMode: {
      type: String,
      default: null,
    },
    audioStrategy: {
      type: String,
      default: null,
    },
    primaryAudioType: {
      type: String,
      default: null,
      index: true,
    },
    eligibleEpisodes: {
      type: Number,
      default: 0,
    },
    sampledEpisodes: {
      type: Number,
      default: 0,
    },
    detectedEpisodes: {
      type: Number,
      default: 0,
    },
    inferredEpisodes: {
      type: Number,
      default: 0,
    },
    noMatchEpisodes: {
      type: Number,
      default: 0,
    },
    copiedEpisodes: {
      type: Number,
      default: 0,
    },
    copiedIntroEpisodes: {
      type: Number,
      default: 0,
    },
    copiedNoMatchEpisodes: {
      type: Number,
      default: 0,
    },
    detections: [
      {
        episodeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Episode',
          default: null,
        },
        episodeNumber: {
          type: Number,
          default: null,
        },
        introStartSec: {
          type: Number,
          default: null,
        },
        introEndSec: {
          type: Number,
          default: null,
        },
        confidence: {
          type: Number,
          default: 0,
        },
        votes: {
          type: Number,
          default: 0,
        },
      },
    ],
    error: {
      message: {
        type: String,
        default: '',
      },
    },
  },
  { _id: false },
);

const introDetectionBatchRunSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
    },
    trigger: {
      type: String,
      default: 'manual',
      index: true,
    },
    state: {
      type: String,
      enum: ['running', 'completed', 'completed_with_errors', 'failed', 'skipped'],
      default: 'running',
      index: true,
    },
    reason: {
      type: String,
      default: '',
    },
    stoppedReason: {
      type: String,
      default: null,
    },
    lockBackend: {
      type: String,
      default: null,
    },
    queueBackend: {
      type: String,
      default: null,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    finishedAt: {
      type: Date,
      default: null,
      index: true,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    timezone: {
      type: String,
      default: 'Asia/Ho_Chi_Minh',
    },
    viewWindow: {
      start: {
        type: Date,
        default: null,
      },
      end: {
        type: Date,
        default: null,
      },
      localDate: {
        type: String,
        default: '',
        index: true,
      },
      timezone: {
        type: String,
        default: 'Asia/Ho_Chi_Minh',
      },
    },
    options: {
      maxMovies: {
        type: Number,
        default: 30,
      },
      maxEpisodesPerMovie: {
        type: Number,
        default: 120,
      },
      includeHidden: {
        type: Boolean,
        default: false,
      },
      retryNoMatch: {
        type: Boolean,
        default: false,
      },
      sampleSize: {
        type: Number,
        default: 5,
      },
      sampleSeconds: {
        type: Number,
        default: 600,
      },
      applySeasonDefault: {
        type: Boolean,
        default: true,
      },
    },
    totalMovies: {
      type: Number,
      default: 0,
    },
    processedMovies: {
      type: Number,
      default: 0,
    },
    detectedMovies: {
      type: Number,
      default: 0,
    },
    noMatchMovies: {
      type: Number,
      default: 0,
    },
    failedMovies: {
      type: Number,
      default: 0,
    },
    skippedMovies: {
      type: Number,
      default: 0,
    },
    movies: [batchMovieSchema],
    errorItems: [
      {
        movieId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Movie',
          default: null,
        },
        movieName: {
          type: String,
          default: '',
        },
        message: {
          type: String,
          default: '',
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

introDetectionBatchRunSchema.index({ startedAt: -1 });
introDetectionBatchRunSchema.index({ state: 1, startedAt: -1 });
introDetectionBatchRunSchema.index({ trigger: 1, startedAt: -1 });
introDetectionBatchRunSchema.index({ 'movies.movieId': 1, startedAt: -1 });

module.exports = mongoose.model('IntroDetectionBatchRun', introDetectionBatchRunSchema);
