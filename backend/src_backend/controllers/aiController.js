import Document from "../models/document.js";
import Flashcard from "../models/flashcard.js";
import Quiz from "../models/quize.js";
import ChatHistory from "../models/chatHistory.js";
import * as geminiService from "../utilities/geminiServices.js"
import { findRelevantChunks } from "../utilities/textChunker.js";

// @desc Generate Flashcards from documents
// @router POST /api/ai/generate-flashcards
// @access Private
export const generateFlashcards = async(req, res, next)=>{
    try {
        const {documentId, count=10} = req.body;

        if(!documentId){
            return res.status(400).json({
                success:false,
                error: 'Please provide docuementId',
                statusCode: 400
            })
        }
        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        })

        if(!document){
            return res.status(404).json({
                success: false,
                error: 'Document not found or not ready',
                statusCode: 404
            })
        }

        //Generate Flashcards using Gemini
        const cards = await geminiService.generateFlashcards(
            document.extractedText,
            parseInt(count)
        )

        //save to database
        const flashcardSet = await Flashcard.create({
            userId: req.user._id,
            documentId: document._id,
            cards: cards.map(card=>({
                question: card.question,
                answer: card.answer,
                difficulty: card.difficulty,
                reviewCount: 0,
                isStared: false
            }))
        });

        res.status(201).json({
            success: true,
            data: flashcardSet,
            message: 'Flashcards generated successfully'
        })
    } catch (error) {
        next(error)
    }
}

// @desc Generate Quiz from documents
// @router POST /api/ai/generate-quiz
// @access Private
export const generateQuiz = async (req, res, next) => {
    try {
        const { documentId, numQuestions = 5, title } = req.body;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId',
                statusCode: 400
            });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or not ready',
                statusCode: 404
            });
        }

        if (!document.extractedText) {
            return res.status(400).json({
                success: false,
                error: 'Document text is empty',
                statusCode: 400
            });
        }

        const questions = await geminiService.generateQuiz(
            document.extractedText,
            parseInt(numQuestions)
        );

        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(500).json({
                success: false,
                error: 'AI failed to generate questions',
                statusCode: 500
            });
        }

        const quiz = await Quiz.create({
            userId: req.user._id,
            documentId: document._id,
            title: title || `${document.title} - Quiz`,
            questions,
            totalQuestions: questions.length,
            userAnswers: [],
            score: 0
        });

        res.status(201).json({
            success: true,
            data: quiz,
            message: 'Quiz generated successfully'
        });

    } catch (error) {
        next(error);
    }
};


// @desc Generate document summary
// @router POST /api/ai/generate-summary
// @access Private
export const generateSummary = async(req, res, next)=>{
    try {
        const { documentId } = req.body;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId',
                statusCode: 400
            });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or not ready',
                statusCode: 404
            });
        }

        //Generate summary using Gemini
        const summary = await geminiService.generateSummary(document.extractedText)

        res.status(201).json({
            success: true,
            data: {
                documentId: document._id,
                title: document.title,
                summary
            },
            message: 'Summary generated successfully'
        });

    } catch (error) {
        next(error);
    }
}

// @desc Chat with document
// @router POST /api/ai/chat
// @access Private
export const chat = async (req, res, next) => {
    try {
        const { documentId, question } = req.body;

        if (!documentId || !question) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId and question',
                statusCode: 400
            });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or not ready',
                statusCode: 404
            });
        }

        // Find relevant chunks
        const relevantChunks = findRelevantChunks(document.chunks, question, 3);
        const chunkIndices = relevantChunks.map(c => c.chunkIndex);

        // Get or create chat history
        let chatHistory = await ChatHistory.findOne({
            userId: req.user._id,
            documentId: document._id
        });

        if (!chatHistory) {
            chatHistory = await ChatHistory.create({
                userId: req.user._id,
                documentId: document._id,
                messages: []
            });
        }

        // ✅ Ensure messages array exists for old documents
        if (!chatHistory.messages) chatHistory.messages = [];

        // Generate response using Gemini safely
        let answer;
        try {
            answer = await geminiService.chatWithContext(question, relevantChunks);
        } catch (err) {
            console.error('Gemini API error:', err);
            answer = "Sorry, the assistant is currently unavailable. Please try again later.";
        }

        // Save conversation
        chatHistory.messages.push(
            { role: 'user', content: question, timeStamp: new Date(), relevantChunks: chunkIndices },
            { role: 'assistant', content: answer, timeStamp: new Date(), relevantChunks: chunkIndices }
        );

        // Optional: keep last 50 messages
        if (chatHistory.messages.length > 50) {
            chatHistory.messages = chatHistory.messages.slice(-50);
        }

        await chatHistory.save();

        res.status(200).json({
            success: true,
            data: {
                question,
                answer,
                relevantChunks: chunkIndices,
                chatHistoryId: chatHistory._id
            },
            message: 'Response generated successfully'
        });

    } catch (error) {
        next(error);
    }
};


// @desc Explain concept from document
// @router POST /api/ai/explain-concept
// @access Private
export const explainConcept = async (req, res, next) => {
    try {
        // ✅ Safe destructuring with fallback
        const { documentId, concept } = req.body || {};

        if (!documentId || !concept) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId and concept',
                statusCode: 400
            });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or not ready',
                statusCode: 404
            });
        }

        // Find relevant chunks for the concept
        const relevantChunks = findRelevantChunks(document.chunks, concept, 3);
        const context = relevantChunks.map(c => c.content).join('\n\n');

        // Generate explanation using Gemini
        let explanation;
        try {
            explanation = await geminiService.explainConcept(concept, context);
        } catch (apiError) {
            console.error('Gemini API error:', apiError);
            explanation = 'Failed to generate explanation due to API issue.';
        }

        res.status(200).json({
            success: true,
            data: {
                concept,
                explanation,
                relevantChunks: relevantChunks.map(c => c.chunkIndex)
            },
            message: 'Explanation generated successfully'
        });

    } catch (error) {
        next(error);
    }
};


// @desc Get chat history for a document
// @router POST /api/ai/chat-history/:documentId
// @access Private
export const getChatHistory = async(req, res, next)=>{
    try {
        const { documentId } = req.params;
        console.log("PARAMS:", req.params);

        if (!documentId ) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId',
                statusCode: 400
            });
        }

        const chatHistory = await ChatHistory.findOne({
            userId: req.user._id,
            documentId: documentId
        }).select('messages'); //only retrieve the messages array

        if (!chatHistory) {
            return res.status(200).json({
                success: true,
                data: [],//Return an empty array if no chat History found
                message:'No chat history found for this document'
            });
        }

        res.status(200).json({
            success: true,
            data: chatHistory.messages,
            message: 'Chat history retrived successfully'
        });

    } catch (error) {
        next(error);
    }
}