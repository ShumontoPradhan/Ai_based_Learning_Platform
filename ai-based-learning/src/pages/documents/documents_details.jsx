import React, {useState, useEffect} from "react";
import {useParams, Link} from "react-router-dom";
import documentService from "../../services/document_service.js";
import Spinner from "../../components/common/spinner.jsx";
import toast from "react-hot-toast";
import {ArrowLeft, ExternalLink} from "lucide-react";
import PageHeader from "../../components/common/pageHeader.jsx";
import Tabs from "../../components/common/tabs.jsx";
import ChatInterface from "../../components/chat/chatInterface.jsx";

const DocumentsDetails =()=>{

    const {id} = useParams();
    const [document, setDocument] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("Content");

    useEffect(()=>{

        const fetchDocumentDetails = async()=>{
            try{
                const data = await documentService.getDocumentById(id);
                // console.log("Fetched Document:", data);
                // console.log("PDF URL:", document?.data?.filePath);
                setDocument(data);
            }
            catch(error){
                console.error("Error fetching document details:", error);
                toast.error("Failed to load document details. Please try again.");
            }
            finally{
                setLoading(false);
            }
        };
        fetchDocumentDetails();
    }, [id, document]);

    // Helper function to get the full PDF URL
    const getPdfUrl =()=>{
        if(!document?.data?.filePath) return null;
        const filePath = document.data.filePath;

        if(filePath.startsWith("http://") || filePath.startsWith("https://")){ 
            return filePath;
        }

        const baseUrl = process.env.REACT_APP_BASE_URL || "http://localhost:5000";
        return `${baseUrl}${filePath.startsWith("/") ? "" : "/"}${filePath}`;
    };
    //replace with above after some time
    // const getPdfUrl = () => {
    // if (!document?.data?.filePath) return null;
    // return document.data.filePath;
    // };

    const renderContent =()=>{
        if(loading){
            return <Spinner/>
        }
        if(!document || !document.data || !document.data.fileName){
            return <div className="text-center p-8">PDF not available.</div>
        }

        const pdfUrl = getPdfUrl();

        return (
            <div className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-300">
                    <span className="text-sm font-medium text-gray-700">Document Viewer</span>
                    <a href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-color-30"
                    >
                        <ExternalLink size={16}/>
                            Open in new tab
                    </a>
                </div>
                <div className="bg-gray-100 p-1">
                    <iframe src={pdfUrl} className="w-full h-[70vh] bg-white rounded border border-gray-300" title="PDF Viewer" frameBorder="0"
                    style={{
                        colorScheme: 'light',
                    }}/>
                </div>
            </div>
        );
    }
    
    const renderChat = () => {
    return <ChatInterface/>;
    }

    const renderAIActions = () => {
        return <div className="p-6">AI Actions Section</div>;
    }

    const renderFlashcardsTab = () => {
        return <div className="p-6">Flashcards will appear here</div>;
    }

    const renderQuizzesTab = () => {
        return <div className="p-6">Quizzes will appear here</div>;
    }
    const tabs =[
        {name: "Content", label:"Content",content: renderContent()},
        {name: "Chat", label:"Chat", content: renderChat()},
        {name: "AI Actions", label:"AI Actions", content: renderAIActions()},
        {name: "Flashcards", label:"Flashcards", content: renderFlashcardsTab()},
        {name: "Quizzes", label:"Quizzes", content: renderQuizzesTab()},
    ];
    if(loading){
        return <Spinner/>
    }
    if(!document){
        return <div className="text-center p-8">Document not found.</div>
    }
    return(
        <div>
            <div className="mb-4">
                <Link to="/documents" className="inline-flex item-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
                    <ArrowLeft size={16}/>
                    Back to Documents
                </Link>
            </div>
            <PageHeader title={document.data.title}/>
            <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab}></Tabs>
        </div>
    )
}

export default DocumentsDetails