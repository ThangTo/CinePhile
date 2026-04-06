const assert = require('assert');
const path = require('path');
const jwt = require('jsonwebtoken');

const middlewarePath = path.resolve(__dirname, '../middleware/auth.middleware.js');
const userModelPath = path.resolve(__dirname, '../models/user.model.js');
const authServicePath = path.resolve(__dirname, '../services/auth.service.js');
const avatarServicePath = path.resolve(__dirname, '../services/avatar.service.js');
const redisServicePath = path.resolve(__dirname, '../services/redis.service.js');
const authUtilsPath = path.resolve(__dirname, '../utils/authUtils.js');

const installMocks = (state) => {
  delete require.cache[middlewarePath];
  delete require.cache[userModelPath];
  delete require.cache[authServicePath];
  delete require.cache[avatarServicePath];
  delete require.cache[redisServicePath];
  delete require.cache[authUtilsPath];

  require.cache[userModelPath] = {
    id: userModelPath,
    filename: userModelPath,
    loaded: true,
    exports: {
      findById(id) {
        state.userLookups.push(id);
        return Promise.resolve(state.usersById[id] || null);
      },
    },
  };

  require.cache[authServicePath] = {
    id: authServicePath,
    filename: authServicePath,
    loaded: true,
    exports: {
      refreshToken(refreshToken) {
        state.refreshCalls.push(refreshToken);
        if (state.refreshError) {
          return Promise.reject(state.refreshError);
        }
        return Promise.resolve(state.refreshResult);
      },
    },
  };

  require.cache[avatarServicePath] = {
    id: avatarServicePath,
    filename: avatarServicePath,
    loaded: true,
    exports: {
      migrateStoredAvatarToR2(user) {
        state.avatarMigrations.push(user?._id || null);
        return Promise.resolve(user);
      },
    },
  };

  require.cache[redisServicePath] = {
    id: redisServicePath,
    filename: redisServicePath,
    loaded: true,
    exports: {
      isConnected: false,
      exists() {
        return Promise.resolve(false);
      },
    },
  };

  require.cache[authUtilsPath] = {
    id: authUtilsPath,
    filename: authUtilsPath,
    loaded: true,
    exports: {
      attachAuthCookies(res, tokens) {
        state.attachedCookies.push(tokens);
        res.__attachedCookies = tokens;
      },
    },
  };

  return require(middlewarePath);
};

const run = async (name, fn) => {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
};

const makeState = () => ({
  usersById: {},
  refreshCalls: [],
  attachedCookies: [],
  avatarMigrations: [],
  userLookups: [],
  refreshResult: null,
  refreshError: null,
});

(async () => {
  process.env.JWT_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

  await run('optionalAuth refreshes and attaches user when access token is expired', async () => {
    const state = makeState();
    state.usersById['user-1'] = { _id: 'user-1', username: 'tester', role: 'user' };
    state.refreshResult = {
      token: jwt.sign({ userId: 'user-1' }, process.env.JWT_SECRET, { expiresIn: '1h' }),
      refreshToken: 'refresh-token-new',
    };

    const { optionalAuth } = installMocks(state);

    const expiredToken = jwt.sign({ userId: 'user-1' }, process.env.JWT_SECRET, { expiresIn: -1 });
    const req = {
      headers: {},
      cookies: {
        accessToken: expiredToken,
        refreshToken: 'refresh-token-old',
      },
    };
    const res = {};
    let nextCalled = false;

    await optionalAuth(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.user?._id, 'user-1');
    assert.deepStrictEqual(state.refreshCalls, ['refresh-token-old']);
    assert.strictEqual(state.userLookups[0], 'user-1');
    assert.strictEqual(state.attachedCookies.length, 1);
    assert.strictEqual(res.__attachedCookies.refreshToken, 'refresh-token-new');
  });

  await run('optionalAuth keeps guest requests anonymous when no token is present', async () => {
    const state = makeState();
    const { optionalAuth } = installMocks(state);

    const req = {
      headers: {},
      cookies: {},
    };
    let nextCalled = false;

    await optionalAuth(req, {}, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.user, null);
    assert.deepStrictEqual(state.refreshCalls, []);
    assert.deepStrictEqual(state.attachedCookies, []);
  });
})();
