const chatService = require('../services/chat.service');

const handleChat = async (req, res) => {
    try{
        const userId = req.user?._id || null;
        const {message, history, metadata} = req.body;

        const answer = await chatService.handleChat({
            userId, 
            message,
            history,
            metadata,
        });
        
        res.json({answer});
    } catch (error) {
        console.error('Chat error: ', error);
        res.status(500).json({ 
            message: error.message || "Chat error",
        });
    }
};

module.exports = {handleChat};