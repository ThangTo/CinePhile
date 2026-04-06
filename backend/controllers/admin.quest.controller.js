const questService = require('../services/quest.service');

const getAdminQuestConfig = async (req, res) => {
  try {
    const data = await questService.getAdminQuestConfig();
    res.json({ success: true, data });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const updateQuestConfig = async (req, res) => {
  try {
    const { type } = req.params;
    const data = await questService.updateQuestConfig(type, req.body, req.user?._id || null);
    res.json({ success: true, data });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const upsertQuestTemplate = async (req, res) => {
  try {
    const data = await questService.upsertQuestTemplate(req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const archiveQuestTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await questService.archiveQuestTemplate(id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

module.exports = {
  getAdminQuestConfig,
  updateQuestConfig,
  upsertQuestTemplate,
  archiveQuestTemplate,
};
