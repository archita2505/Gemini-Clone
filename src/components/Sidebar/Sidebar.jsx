import React, {useCallback, useEffect, useRef, useState, useContext} from 'react';
import './Sidebar.css';
import {assets} from '../../assets/assets';
import { Context } from '../../context/Context';


const Sidebar = () => {

    const [extended,setExtended] = useState(false);
    const [activePanel, setActivePanel] = useState(null);
    const helpButtonRef = useRef(null);
    const activityButtonRef = useRef(null);
    const settingsButtonRef = useRef(null);
    const panelCloseRef = useRef(null);
    const {onSent, previousPrompts, setInput, startNewChat, clearRecentActivity, theme, setTheme} = useContext(Context);

    const closePanel = useCallback(() => {
        const panelToClose = activePanel;
        setActivePanel(null);
        const triggerRef = {
            activity: activityButtonRef,
            settings: settingsButtonRef,
            help: helpButtonRef,
        }[panelToClose];
        triggerRef?.current?.focus();
    }, [activePanel]);

    useEffect(() => {
        if (!activePanel) return undefined;

        panelCloseRef.current?.focus();
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                closePanel();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [activePanel, closePanel]);

    const loadPrompt = async (prompt) => {
        await onSent(prompt);
    }

  return (
    <div className='sidebar'>
         <div className="top">
            <img onClick={()=>setExtended(prev=>!prev)} className='menu' src={assets.menu_icon} alt="" />
            <button className="new-chat" type="button" onClick={startNewChat} aria-label="New chat">
                <img src={assets.plus_icon} alt=""/>
                {extended ? <p>New Chat</p> : null}
            </button>
            {extended ?
            <div className="recent">
                <p className="recent-title">Recent</p>
                {previousPrompts.map((item,index)=>{
                    return(
                         <div key={`${item}-${index}`} onClick={()=> loadPrompt(item)} className="recent-entry">
                    <img src={assets.message_icon} alt="" />
                    <p>{item.slice(0,18)}...</p>
                </div>
                    )
                })}       
            </div> 
            : null}
         </div>
         <div className="bottom">
            <button
                ref={helpButtonRef}
                className="bottom-item recent-entry sidebar-action"
                type="button"
                onClick={() => setActivePanel('help')}
                aria-haspopup="dialog"
                aria-expanded={activePanel === 'help'}
                aria-label="Help"
            >
                <img src={assets.question_icon} alt="" />
                {extended ? <p>Help</p> : null}
            </button>
            <button
                ref={activityButtonRef}
                className="bottom-item recent-entry sidebar-action"
                type="button"
                onClick={() => setActivePanel('activity')}
                aria-haspopup="dialog"
                aria-expanded={activePanel === 'activity'}
                aria-label="Activity"
            >
                <img src={assets.history_icon} alt="" />
                {extended ? <p>Activity</p> : null}
            </button>
            <button
                ref={settingsButtonRef}
                className="bottom-item recent-entry sidebar-action"
                type="button"
                onClick={() => setActivePanel('settings')}
                aria-haspopup="dialog"
                aria-expanded={activePanel === 'settings'}
                aria-label="Settings"
            >
                <img src={assets.setting_icon} alt="" />
                {extended ? <p>Setting</p> : null}
            </button>
         </div>
         {activePanel && (
            <div className="help-overlay" onMouseDown={(event) => {
                if (event.target === event.currentTarget) closePanel();
            }}>
                <section
                    className="help-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={`${activePanel}-title`}
                    aria-describedby={`${activePanel}-description`}
                >
                    <div className="help-header">
                        <div>
                            <p className="help-eyebrow">
                                {activePanel === 'help' ? 'GEMINI CLONE' : activePanel === 'activity' ? 'YOUR PROMPTS' : 'PREFERENCES'}
                            </p>
                            <h2 id={`${activePanel}-title`}>
                                {activePanel === 'help' ? 'How can we help?' : activePanel === 'activity' ? 'Recent activity' : 'Settings'}
                            </h2>
                        </div>
                        <button ref={panelCloseRef} className="help-close" type="button" onClick={closePanel} aria-label="Close panel">×</button>
                    </div>
                    {activePanel === 'help' ? (
                        <>
                            <p id="help-description" className="help-intro">Quick tips for using this chat.</p>
                            <div className="help-content">
                                <article>
                                    <h3>Ask a question</h3>
                                    <p>Type a prompt and press Enter or select Send. Ask a follow-up in the same chat to keep the conversation context.</p>
                                </article>
                                <article>
                                    <h3>Start a fresh chat</h3>
                                    <p>Select New Chat in the side panel to clear the current conversation and its context.</p>
                                </article>
                                <article>
                                    <h3>Upload an image</h3>
                                    <p>Select the gallery icon to attach one JPEG, PNG, WebP, or GIF image up to 5 MB. Add a question or send it for a description.</p>
                                </article>
                                <article>
                                    <h3>Use voice input</h3>
                                    <p>Select the microphone, allow browser microphone access, and speak. Voice input requires a supported browser such as Chrome or Edge.</p>
                                </article>
                                <article>
                                    <h3>If a response fails</h3>
                                    <p>Check that the API server is running and your Gemini API key and model quota are configured. Errors appear below the question.</p>
                                </article>
                            </div>
                            <button className="help-done" type="button" onClick={closePanel}>Got it</button>
                        </>
                    ) : activePanel === 'activity' ? (
                        <>
                            <p id="activity-description" className="help-intro">
                                Choose a previous prompt to put it back in the input. It won’t send until you press Enter or Send.
                            </p>
                            {previousPrompts.length ? (
                                <div className="activity-list">
                                    {[...previousPrompts].reverse().map((prompt, index) => (
                                        <button
                                            className="activity-entry"
                                            type="button"
                                            key={`${prompt}-${index}`}
                                            onClick={() => {
                                                setInput(prompt);
                                                closePanel();
                                            }}
                                        >
                                            <img src={assets.message_icon} alt="" />
                                            <span>{prompt}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="activity-empty">Your prompts will appear here after you start chatting.</p>
                            )}
                        </>
                    ) : (
                        <>
                            <p id="settings-description" className="help-intro">Choose how Gemini Clone looks and manage your recent prompt list.</p>
                            <div className="settings-section">
                                <h3>Appearance</h3>
                                <div className="theme-options" role="group" aria-label="Appearance">
                                    {['light', 'dark'].map((option) => (
                                        <button
                                            className={`theme-option${theme === option ? ' selected' : ''}`}
                                            type="button"
                                            key={option}
                                            onClick={() => setTheme(option)}
                                            aria-pressed={theme === option}
                                        >
                                            <span className={`theme-preview ${option}`} aria-hidden="true" />
                                            <span>{option === 'light' ? 'Light' : 'Dark'}</span>
                                            {theme === option && <span className="theme-selected">Selected</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="settings-section">
                                <h3>Recent activity</h3>
                                <p className="settings-help">Clear the prompt list shown in the Activity panel. This does not delete the current conversation.</p>
                                <button
                                    className="clear-activity"
                                    type="button"
                                    onClick={clearRecentActivity}
                                    disabled={previousPrompts.length === 0}
                                >
                                    Clear recent activity
                                </button>
                            </div>
                        </>
                    )}
                </section>
            </div>
         )}
    </div>
  )
}

export default Sidebar