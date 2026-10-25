import { useEffect, useState } from "react";
import main from '../config/gemini';
import { marked } from "marked";
import { Context } from "./Context";

const ContextProvider = (props) => {

    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem("gemini-clone-theme") === "dark" ? "dark" : "light";
        } catch (error) {
            console.warn("Could not read the saved appearance setting.", error);
            return "light";
        }
    });
    const [input,setInput] = useState("");
    const [recentPrompt, setRecentPrompt] = useState("");
    const [previousPrompts, setPreviousPrompts] = useState([]);
    const [showResult, setShowResult] = useState(false);
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState([]);
    const [previousInteractionId, setPreviousInteractionId] = useState("");

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        try {
            localStorage.setItem("gemini-clone-theme", theme);
        } catch (error) {
            console.warn("Could not save the appearance setting.", error);
        }
    }, [theme]);

    const onSent = async(prompt, image) => {
        const submittedPrompt = (prompt ?? input).trim();
        if ((!submittedPrompt && !image) || loading) return false;

        const messageIndex = messages.length;
        const displayPrompt = submittedPrompt || "Describe this image";
        setMessages(prev => [...prev, {
            prompt: displayPrompt,
            image: image ? { previewUrl: image.previewUrl, name: image.name } : null,
            response: "",
            error: "",
        }]);
        if (submittedPrompt) {
            setRecentPrompt(submittedPrompt);
            setPreviousPrompts(prev => [...prev, submittedPrompt]);
        }
        setLoading(true);
        setShowResult(true);
        try {
            const result = await main(submittedPrompt, previousInteractionId, image);
            const html = await marked.parse(result.text);
            setPreviousInteractionId(result.interactionId);
            setMessages(prev => prev.map((message, index) =>
                index === messageIndex ? { ...message, response: result.text, responseHtml: html } : message
            ));
            setInput("");
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : "The request failed. Please try again.";
            setMessages(prev => prev.map((turn, index) =>
                index === messageIndex ? { ...turn, error: message } : turn
            ));
            return false;
        } finally {
            setLoading(false);
        }
     }

    const startNewChat = () => {
        setInput("");
        setRecentPrompt("");
        setMessages([]);
        setPreviousInteractionId("");
        setShowResult(false);
    };

    const clearRecentActivity = () => setPreviousPrompts([]);
     
    const contextValue={
       previousPrompts,
       setPreviousPrompts,
       onSent,
       startNewChat,
       clearRecentActivity,
       theme,
       setTheme,
       setRecentPrompt,
       recentPrompt,
       showResult,
       loading,
       messages,
       input,
       setInput
    }


    return(
        <Context.Provider value={contextValue}>
            {props.children}
            </Context.Provider>
    )
}

export default ContextProvider;