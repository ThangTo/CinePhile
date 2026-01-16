const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const Movie = require('../models/movie.model');
const Episode = require('../models/episode.model');

// Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY;
const R2_SECRET_KEY = process.env.R2_SECRET_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN;

const VIDEO_FOLDER = 'F:/Movie';
const INTERVAL = 10;
const THUMB_WIDTH = 320;
const AD_KEYWORDS = ['/v7/', '/adjump/', 'google', 'ads', 'doubleclick', 'facebook'];

// S3 Client
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

// Upload to R2
async function uploadToR2(filePath, fileName, contentType, folderPath = '') {
  const fileStream = fs.createReadStream(filePath);
  const key = folderPath ? `thumbnails/${folderPath}/${fileName}` : `thumbnails/${fileName}`;

  const uploadParams = {
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: fileStream,
    ContentType: contentType,
  };

  await s3Client.send(new PutObjectCommand(uploadParams));
  return `${PUBLIC_DOMAIN}/${key}`;
}

// Fetch text from URL
async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch: ${url} (Status: ${response.status})`);
  return await response.text();
}

// Download video from m3u8
async function downloadVideoFromM3U8(m3u8Url, outputPath, sendProgress) {
  const { exec } = require('child_process');

  try {
    let currentUrl = m3u8Url;
    let content = await fetchText(currentUrl);

    // Check for master playlist
    if (content.includes('#EXT-X-STREAM-INF')) {
      const lines = content.split('\n');
      let maxBandwidth = 0;
      let bestUri = '';

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('BANDWIDTH=')) {
          const match = lines[i].match(/BANDWIDTH=(\d+)/);
          const bandwidth = match ? parseInt(match[1]) : 0;

          if (lines[i + 1] && bandwidth > maxBandwidth) {
            maxBandwidth = bandwidth;
            bestUri = lines[i + 1].trim();
          }
        }
      }

      if (bestUri) {
        currentUrl = new URL(bestUri, currentUrl).toString();
        content = await fetchText(currentUrl);
      }
    }

    // Filter ads
    const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
    const lines = content.split('\n');
    const cleanLines = [];
    let skipNext = false;
    let adsRemoved = 0;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith('#EXTINF')) {
        let nextLine = (lines[i + 1] || '').trim();

        if (nextLine && !nextLine.startsWith('#')) {
          const isAd = AD_KEYWORDS.some((k) => nextLine.includes(k));

          if (isAd) {
            skipNext = true;
            adsRemoved++;
            continue;
          }
        }
      }

      if (skipNext) {
        skipNext = false;
        continue;
      }

      if (line.includes('#EXT-X-DISCONTINUITY')) continue;

      if (!line.startsWith('#')) {
        if (!line.startsWith('http')) {
          line = new URL(line, baseUrl).toString();
        }

        if (line.includes('convertv7/')) {
          line = line.replace('convertv7/', '');
        }
      }

      cleanLines.push(line);
    }

    // Write clean m3u8
    const cleanM3u8Path = path.join(
      VIDEO_FOLDER,
      `${path.basename(outputPath, '.mp4')}_clean.m3u8`,
    );
    fs.writeFileSync(cleanM3u8Path, cleanLines.join('\n'));

    // Download with FFmpeg
    const command = [
      'ffmpeg',
      '-protocol_whitelist file,http,https,tcp,tls,crypto',
      `-i "${cleanM3u8Path}"`,
      '-c copy',
      '-bsf:a aac_adtstoasc',
      `-y "${outputPath}"`,
    ].join(' ');

    return new Promise((resolve, reject) => {
      const ffmpegProcess = exec(command);

      ffmpegProcess.stderr.on('data', (data) => {
        const output = data.toString();
        const timeMatch = output.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);

        if (timeMatch && sendProgress) {
          sendProgress({ type: 'log', message: `Downloading: ${timeMatch[1]}` });
        }
      });

      ffmpegProcess.on('close', (code) => {
        try {
          fs.unlinkSync(cleanM3u8Path);
        } catch (err) {
          // Ignore
        }

        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg exited with code: ${code}`));
        }
      });

      ffmpegProcess.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    throw error;
  }
}

// Create VTT file
function createVTTFile(duration, columns, rows, thumbWidth, thumbHeight, spriteName, outputPath) {
  let vttContent = 'WEBVTT\n\n';
  let currentTime = 0;
  let count = 0;

  const formatTime = (seconds) => {
    const date = new Date(0);
    date.setSeconds(seconds);
    const timeStr = date.toISOString().substring(11, 19);
    const ms = (seconds % 1).toFixed(3).substring(2);
    return `${timeStr}.${ms}`;
  };

  while (currentTime < duration) {
    const endTime = Math.min(currentTime + INTERVAL, duration);

    const colIndex = count % columns;
    const rowIndex = Math.floor(count / columns);
    const x = colIndex * thumbWidth;
    const y = rowIndex * thumbHeight;

    vttContent += `${formatTime(currentTime)} --> ${formatTime(endTime)}\n`;
    vttContent += `${spriteName}#xywh=${x},${y},${thumbWidth},${thumbHeight}\n\n`;

    currentTime += INTERVAL;
    count++;
  }

  fs.writeFileSync(outputPath, vttContent);
}

// Generate thumbnails
async function generateThumbnails(
  movieSlug,
  videoPath,
  sendProgress,
  episodeNumber = null,
  totalEpisodes = null,
) {
  const outputFolder = './temp_output';
  if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder);

  // For TV series, include episode number in filename
  const filePrefix = episodeNumber ? `${movieSlug}-tap-${episodeNumber}` : movieSlug;
  const spriteFileName = `${filePrefix}-sprite.jpg`;
  const vttFileName = `${filePrefix}.vtt`;
  const spriteOutputPath = path.join(outputFolder, spriteFileName);
  const vttOutputPath = path.join(outputFolder, vttFileName);

  // Check if files exist
  const spriteExists = fs.existsSync(spriteOutputPath);
  const vttExists = fs.existsSync(vttOutputPath);

  if (!spriteExists || !vttExists) {
    if (sendProgress) {
      const episodeInfo = episodeNumber ? ` Tập ${episodeNumber}/${totalEpisodes}` : '';
      sendProgress({
        type: 'log',
        message: `📹 Analyzing video metadata...${episodeInfo}`,
      });
    }

    // Get metadata
    const metadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    const duration = metadata.format.duration;
    const originalHeight = metadata.streams[0].height || 1080;
    const originalWidth = metadata.streams[0].width || 1920;
    const thumbHeight = Math.round((THUMB_WIDTH / originalWidth) * originalHeight);

    const totalThumbs = Math.floor(duration / INTERVAL);
    const columns = Math.ceil(Math.sqrt(totalThumbs));
    const rows = Math.ceil(totalThumbs / columns);

    if (sendProgress) {
      const episodeInfo = episodeNumber ? ` Tập ${episodeNumber}/${totalEpisodes}` : '';
      sendProgress({
        type: 'log',
        message: `🎬 Video: ${Math.floor(duration / 60)}m${Math.floor(
          duration % 60,
        )}s | ${totalThumbs} thumbnails (${columns}x${rows} grid)${episodeInfo}`,
      });
    }

    // Create sprite
    if (sendProgress) {
      const episodeInfo = episodeNumber ? ` Tập ${episodeNumber}/${totalEpisodes}` : '';
      sendProgress({
        type: 'log',
        message: `🖼️  Creating sprite image...${episodeInfo}`,
      });
    }

    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .complexFilter([
          `fps=1/${INTERVAL},scale=${THUMB_WIDTH}:${thumbHeight}[thumbs]`,
          `[thumbs]tile=${columns}x${rows}[sprite]`,
        ])
        .outputOptions(['-map [sprite]', '-vframes 1'])
        .output(spriteOutputPath)
        .on('progress', (progress) => {
          if (progress.percent && sendProgress) {
            const episodeInfo = episodeNumber ? ` Tập ${episodeNumber}/${totalEpisodes}` : '';
            sendProgress({
              type: 'log',
              message: `   ⏳ Sprite: ${progress.percent.toFixed(1)}%${episodeInfo}`,
            });
          }
        })
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    if (sendProgress) {
      const episodeInfo = episodeNumber ? ` Tập ${episodeNumber}/${totalEpisodes}` : '';
      sendProgress({
        type: 'log',
        message: `✅ Sprite created successfully${episodeInfo}`,
      });
    }

    // Create VTT
    if (sendProgress) {
      const episodeInfo = episodeNumber ? ` Tập ${episodeNumber}/${totalEpisodes}` : '';
      sendProgress({
        type: 'log',
        message: `📝 Creating VTT file...${episodeInfo}`,
      });
    }
    createVTTFile(duration, columns, rows, THUMB_WIDTH, thumbHeight, spriteFileName, vttOutputPath);
    if (sendProgress) {
      const episodeInfo = episodeNumber ? ` Tập ${episodeNumber}/${totalEpisodes}` : '';
      sendProgress({
        type: 'log',
        message: `✅ VTT file created${episodeInfo}`,
      });
    }
  } else {
    if (sendProgress) {
      const episodeInfo = episodeNumber ? ` Tập ${episodeNumber}/${totalEpisodes}` : '';
      sendProgress({
        type: 'log',
        message: `♻️  Using existing sprite and VTT files${episodeInfo}`,
      });
    }
  }

  // Upload to R2 (with folder for TV series)
  if (sendProgress) {
    const episodeInfo = episodeNumber ? ` Tập ${episodeNumber}/${totalEpisodes}` : '';
    sendProgress({
      type: 'log',
      message: `☁️  Uploading to R2...${episodeInfo}`,
    });
  }

  const folderPath = episodeNumber ? movieSlug : '';
  const spriteUrl = await uploadToR2(spriteOutputPath, spriteFileName, 'image/jpeg', folderPath);
  const vttUrl = await uploadToR2(vttOutputPath, vttFileName, 'text/vtt', folderPath);

  if (sendProgress) {
    const episodeInfo = episodeNumber ? ` Tập ${episodeNumber}/${totalEpisodes}` : '';
    sendProgress({
      type: 'log',
      message: `✅ Upload complete${episodeInfo}`,
    });
  }

  return { spriteUrl, vttUrl };
}

// Process single episode of a TV series
async function processSingleEpisode(
  movie,
  episode,
  episodeNumber,
  totalEpisodes,
  force,
  sendProgress,
) {
  const movieSlug = movie.slug;
  const logPrefix = `🎬 [${movie.name}] Tập ${episodeNumber}/${totalEpisodes}`;

  try {
    sendProgress({
      type: 'log',
      message: `\n${logPrefix}`,
    });

    // Check if already has thumbnails
    if (episode.thumbnail_sprite && episode.thumbnail_vtt && !force) {
      sendProgress({
        type: 'log',
        message: `${logPrefix} ⏭️  Already has thumbnails (skipped)`,
      });
      return {
        success: true,
        skipped: true,
        episodeId: episode._id,
        episodeNumber: episodeNumber,
      };
    }

    // Create folder for TV series videos
    const seriesFolder = path.join(VIDEO_FOLDER, movieSlug);
    if (!fs.existsSync(seriesFolder)) {
      fs.mkdirSync(seriesFolder, { recursive: true });
    }

    // Check video file
    let videoPath = path.join(seriesFolder, `${movieSlug}-tap-${episodeNumber}.mp4`);

    if (!fs.existsSync(videoPath)) {
      sendProgress({
        type: 'log',
        message: `${logPrefix} 📥 Video not found locally, downloading...`,
      });

      if (!episode.link_m3u8) {
        throw new Error('No m3u8 link found for this episode');
      }

      videoPath = await downloadVideoFromM3U8(episode.link_m3u8, videoPath, sendProgress);
      sendProgress({
        type: 'log',
        message: `${logPrefix} ✅ Video downloaded`,
      });
    } else {
      sendProgress({
        type: 'log',
        message: `${logPrefix} ✅ Video found locally`,
      });

      // Verify video file is valid
      try {
        await new Promise((resolve, reject) => {
          ffmpeg.ffprobe(videoPath, (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });
      } catch (verifyError) {
        // Video file is corrupted, delete and re-download
        sendProgress({
          type: 'log',
          message: `${logPrefix} ⚠️  Video file corrupted, deleting and re-downloading...`,
        });

        try {
          fs.unlinkSync(videoPath);
        } catch (e) {
          // Ignore delete error
        }

        if (!episode.link_m3u8) {
          throw new Error('No m3u8 link found for this episode');
        }

        videoPath = await downloadVideoFromM3U8(episode.link_m3u8, videoPath, sendProgress);
        sendProgress({
          type: 'log',
          message: `${logPrefix} ✅ Video re-downloaded successfully`,
        });
      }
    }

    // Generate thumbnails
    const { spriteUrl, vttUrl } = await generateThumbnails(
      movieSlug,
      videoPath,
      sendProgress,
      episodeNumber,
      totalEpisodes,
    );

    // Update database for this episode
    sendProgress({
      type: 'log',
      message: `${logPrefix} 💾 Updating database...`,
    });

    await Episode.updateOne(
      { _id: episode._id },
      {
        $set: {
          thumbnail_sprite: spriteUrl,
          thumbnail_vtt: vttUrl,
        },
      },
    );

    sendProgress({
      type: 'log',
      message: `${logPrefix} ✅ Complete!\n`,
    });

    return {
      success: true,
      episodeId: episode._id,
      episodeNumber: episodeNumber,
      spriteUrl,
      vttUrl,
    };
  } catch (error) {
    sendProgress({
      type: 'log',
      message: `${logPrefix} ❌ Error: ${error.message}\n`,
    });
    return {
      success: false,
      episodeId: episode._id,
      episodeNumber: episodeNumber,
      error: error.message,
    };
  }
}

// Process TV series (multiple episodes)
async function processTVSeries(movie, force, sendProgress) {
  sendProgress({
    type: 'log',
    message: `\n📺 [${movie.name}] - Phim bộ (${movie.totalEpisodes} tập)`,
  });

  // Get all episodes with priority: long-tieng -> thuyet-minh -> vietsub
  const priority = ['long-tieng', 'thuyet-minh', 'vietsub'];
  let selectedAudioType = null;
  let episodes = [];

  for (const audioType of priority) {
    episodes = await Episode.find({
      movieId: movie._id,
      audioType: audioType,
      link_m3u8: { $exists: true, $ne: null },
    }).sort({ episodeNumber: 1 });

    if (episodes.length > 0) {
      selectedAudioType = audioType;
      sendProgress({
        type: 'log',
        message: `✅ Chọn audioType: ${audioType} (${episodes.length} tập)`,
      });
      break;
    }
  }

  if (episodes.length === 0) {
    throw new Error('No episodes found with m3u8 links');
  }

  const totalEpisodes = episodes.length;

  // Process all episodes in parallel
  sendProgress({
    type: 'log',
    message: `🚀 Bắt đầu xử lý ${totalEpisodes} tập song song...\n`,
  });

  const results = await Promise.allSettled(
    episodes.map((episode, index) =>
      processSingleEpisode(
        movie,
        episode,
        episode.episodeNumber || index + 1,
        totalEpisodes,
        force,
        sendProgress,
      ),
    ),
  );

  // Count results
  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const data = result.value;
      if (data.success) {
        if (data.skipped) {
          skippedCount++;
        } else {
          successCount++;
        }
      } else {
        failedCount++;
      }
    } else {
      failedCount++;
    }
  });

  sendProgress({
    type: 'log',
    message: `\n📊 Tổng kết: ✅ ${successCount} thành công | ⏭️  ${skippedCount} bỏ qua | ❌ ${failedCount} thất bại`,
  });

  return {
    success: true,
    movieId: movie._id,
    movieName: movie.name,
    totalEpisodes: totalEpisodes,
    successCount,
    skippedCount,
    failedCount,
  };
}

// Process single movie
async function processMovie(movieId, force, sendProgress) {
  try {
    const movie = await Movie.findById(movieId);
    if (!movie) {
      throw new Error('Movie not found');
    }

    // Check if it's a TV series or single movie
    const isTVSeries = movie.totalEpisodes && movie.totalEpisodes > 1;

    if (isTVSeries) {
      // Process TV series (multiple episodes)
      return await processTVSeries(movie, force, sendProgress);
    }

    // Process single movie (original logic)
    sendProgress({
      type: 'log',
      message: `\n🎬 [${movie.name}] - Phim lẻ`,
    });

    // Check if already has thumbnails
    const existingEpisode = await Episode.findOne({ movieId: movie._id });
    if (
      existingEpisode &&
      existingEpisode.thumbnail_sprite &&
      existingEpisode.thumbnail_vtt &&
      !force
    ) {
      sendProgress({
        type: 'log',
        message: `⏭️  Already has thumbnails (skipped)`,
      });
      return {
        success: true,
        skipped: true,
        movieId: movie._id,
        movieName: movie.name,
      };
    }

    // Check video file
    let videoPath = path.join(VIDEO_FOLDER, `${movie.slug}.mp4`);

    if (!fs.existsSync(videoPath)) {
      sendProgress({
        type: 'log',
        message: `📥 Video not found locally, downloading...`,
      });

      // Find episode with m3u8 link
      const episodes = await Episode.find({ movieId: movie._id });

      if (episodes.length === 0) {
        throw new Error('No episodes found');
      }

      const priority = ['long-tieng', 'thuyet-minh', 'vietsub'];
      let selectedEpisode = null;

      for (const audioType of priority) {
        selectedEpisode = episodes.find((ep) => ep.audioType === audioType && ep.link_m3u8);
        if (selectedEpisode) break;
      }

      if (!selectedEpisode) {
        selectedEpisode = episodes.find((ep) => ep.link_m3u8);
      }

      if (!selectedEpisode || !selectedEpisode.link_m3u8) {
        throw new Error('No m3u8 link found');
      }

      videoPath = await downloadVideoFromM3U8(selectedEpisode.link_m3u8, videoPath, sendProgress);
      sendProgress({
        type: 'log',
        message: `✅ Video downloaded`,
      });
    } else {
      sendProgress({
        type: 'log',
        message: `✅ Video found locally`,
      });

      // Verify video file is valid
      try {
        await new Promise((resolve, reject) => {
          ffmpeg.ffprobe(videoPath, (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });
      } catch (verifyError) {
        // Video file is corrupted, delete and re-download
        sendProgress({
          type: 'log',
          message: `⚠️  Video file corrupted, deleting and re-downloading...`,
        });

        try {
          fs.unlinkSync(videoPath);
        } catch (e) {
          // Ignore delete error
        }

        // Find episode with m3u8 link
        const episodes = await Episode.find({ movieId: movie._id });

        if (episodes.length === 0) {
          throw new Error('No episodes found');
        }

        const priority = ['long-tieng', 'thuyet-minh', 'vietsub'];
        let selectedEpisode = null;

        for (const audioType of priority) {
          selectedEpisode = episodes.find((ep) => ep.audioType === audioType && ep.link_m3u8);
          if (selectedEpisode) break;
        }

        if (!selectedEpisode) {
          selectedEpisode = episodes.find((ep) => ep.link_m3u8);
        }

        if (!selectedEpisode || !selectedEpisode.link_m3u8) {
          throw new Error('No m3u8 link found');
        }

        videoPath = await downloadVideoFromM3U8(selectedEpisode.link_m3u8, videoPath, sendProgress);
        sendProgress({
          type: 'log',
          message: `✅ Video re-downloaded successfully`,
        });
      }
    }

    // Generate thumbnails
    const { spriteUrl, vttUrl } = await generateThumbnails(movie.slug, videoPath, sendProgress);

    // Update database
    sendProgress({
      type: 'log',
      message: `💾 Updating database...`,
    });
    const updateResult = await Episode.updateMany(
      { movieId: movie._id },
      {
        $set: {
          thumbnail_sprite: spriteUrl,
          thumbnail_vtt: vttUrl,
        },
      },
    );

    sendProgress({
      type: 'log',
      message: `✅ Complete! Updated ${updateResult.modifiedCount} episodes\n`,
    });

    return {
      success: true,
      movieId: movie._id,
      movieName: movie.name,
      episodesUpdated: updateResult.modifiedCount,
      spriteUrl,
      vttUrl,
    };
  } catch (error) {
    sendProgress({
      type: 'log',
      message: `❌ Error: ${error.message}\n`,
    });
    return {
      success: false,
      movieId: movieId,
      error: error.message,
    };
  }
}

// Process movies in parallel (like the original script)
exports.processMoviesParallel = async (movieIds, force, sendProgress) => {
  let completedCount = 0;

  // Create a wrapper for each movie that tracks progress
  const processWithProgress = async (movieId) => {
    try {
      const result = await processMovie(movieId, force, sendProgress);

      // Increment completed count
      completedCount++;

      // Send progress update
      sendProgress({
        type: 'progress',
        current: completedCount,
        total: movieIds.length,
        result: result,
      });

      return result;
    } catch (error) {
      // Increment completed count even on error
      completedCount++;

      const errorResult = {
        success: false,
        movieId: movieId,
        movieName: 'Unknown',
        error: error.message,
      };

      // Send progress update
      sendProgress({
        type: 'progress',
        current: completedCount,
        total: movieIds.length,
        result: errorResult,
      });

      throw error;
    }
  };

  // Process all movies in parallel using Promise.allSettled
  const results = await Promise.allSettled(movieIds.map((movieId) => processWithProgress(movieId)));

  return results;
};
