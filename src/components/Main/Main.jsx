import React, { useContext, useEffect, useRef, useState } from 'react'
import './Main.css';
import {assets} from '../../assets/assets'
import { Context } from '../../context/Context';

const Main = () => {

  const{onSent,showResult,loading,messages,setInput,input} = useContext(Context);
  const [selectedImage, setSelectedImage] = useState(null);
  const [voiceError, setVoiceError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const onImageSelected = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const supportedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!supportedTypes.includes(file.type)) {
      setVoiceError("Choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setVoiceError("Images must be 5 MB or smaller.");
      return;
    }

    setVoiceError("");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setVoiceError("The selected image could not be read.");
        return;
      }
      setSelectedImage({
        name: file.name,
        mimeType: file.type,
        base64: reader.result.split(",")[1],
        previewUrl: reader.result,
      });
    };
    reader.onerror = () => setVoiceError("The selected image could not be read.");
    reader.readAsDataURL(file);
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("Voice input is not supported by this browser. Try Chrome or Edge.");
      return;
    }

    setVoiceError("");
    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognitionRef.current = recognition;
    let finalTranscript = "";
    let lastFinalResultIndex = 0;

    recognition.onresult = (event) => {
      for (let index = Math.max(event.resultIndex, lastFinalResultIndex); index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
          lastFinalResultIndex = index + 1;
        }
      }
    };
    recognition.onerror = (event) => {
      setVoiceError(event.error === "not-allowed"
        ? "Microphone access was blocked. Allow microphone access in your browser settings and try again."
        : `Voice input failed: ${event.error}. Please try again.`);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      const transcript = finalTranscript.trim();
      if (transcript) {
        setInput(current => `${current.trim()}${current.trim() ? " " : ""}${transcript}`);
      }
    };

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setVoiceError("Voice input could not start. Please try again.");
      setIsListening(false);
    }
  };

  const sendPrompt = (prompt = input) => {
    if (loading) return;
    const imageForPrompt = selectedImage;
    onSent(prompt, imageForPrompt).then((sent) => {
      if (sent) setSelectedImage(null);
    });
  };

  return (
    <div className='main'>
      <div className="nav">
        <p>Gemini</p>
        <img src={assets.user_icon} alt="" />
      </div>
      <div className="main-container">

        {!showResult 
        ?<>
           <div className="greet">
          <p><span>Hello,Archita.</span></p>
          <p>How can I help you today?</p>
        </div>
        <div className="cards">
          <button className="card" type="button" onClick={() => sendPrompt("Suggest beautiful places to see on an upcoming road trip")}>
            <p>Suggest beautiful places to see on an upcoming road trip</p>
            <img src={assets.compass_icon} alt="" />
          </button>
          <button className="card" type="button" onClick={() => sendPrompt("Briefly summarize this concept: urban planning")}>
            <p>Briefly summarize this concept: urban planning</p>
            <img src={assets.bulb_icon} alt="" />
          </button>
          <button className="card" type="button" onClick={() => sendPrompt("Brainstorm team bonding activities for our work retreat")}>
            <p>Brainstorm team bonding activities for our work retreat </p>
            <img src={assets.message_icon} alt="" />
          </button>
          <button className="card" type="button" onClick={() => sendPrompt("Improve the readability of the following code")}>
            <p>Improve the readability of the following code</p>
            <img src={assets.code_icon} alt="" />
          </button>
        </div>
        </> : <div className="result">
          {messages.map((message, index) => (
            <div className="conversation-turn" key={`${index}-${message.prompt}`}>
              <div className="result-title">
                <img src={assets.user_icon} alt="" />
                <p>{message.prompt}</p>
              </div>
              {message.image && (
                <img className="conversation-image" src={message.image.previewUrl} alt={message.image.name} />
              )}
              <div className="result-data">
                <img src={assets.gemini_icon} alt="" />
                {loading && index === messages.length - 1 && !message.response && !message.error
                  ? <div className="loader" aria-label="Generating response">
                      <hr />
                      <hr />
                      <hr />
                    </div>
                  : message.error
                    ? <div className="error-message" role="alert">{message.error}</div>
                    : <div className="response-text" dangerouslySetInnerHTML={{__html: message.responseHtml || ""}} />
                }
              </div>
            </div>
          ))}
        </div>
        }
        
        <div className="main-bottom">
          <div className="search-box">
            {selectedImage && (
              <div className="selected-image">
                <img src={selectedImage.previewUrl} alt="" />
                <span>{selectedImage.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  aria-label="Remove selected image"
                >
                  ×
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              className="file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onImageSelected}
              aria-label="Choose an image to upload"
            />
            <input
              onChange={(e)=>setInput(e.target.value)}
              onKeyDown={(e)=>{if(e.key === 'Enter'){e.preventDefault(); sendPrompt();}}}
              value={input}
              type="text"
              placeholder='Enter a prompt here'
              aria-label="Enter a prompt"
            />
            <div>
              <button
                className="input-action"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                aria-label="Upload an image"
                title="Upload an image"
              >
                <img src={assets.gallery_icon} alt="" />
              </button>
              <button
                className={`input-action${isListening ? " listening" : ""}`}
                type="button"
                onClick={toggleVoiceInput}
                disabled={loading}
                aria-label={isListening ? "Stop voice input" : "Start voice input"}
                title={isListening ? "Stop voice input" : "Start voice input"}
              >
                <img src={assets.mic_icon} alt="" />
              </button>
              <button
                className="send-button"
                type="button"
                onClick={()=>sendPrompt()}
                disabled={loading || (!input.trim() && !selectedImage)}
                aria-label="Send prompt"
              >
                <img src={assets.send_icon} alt="" />
              </button>
            </div>
            </div>
            {voiceError && <p className="input-error" role="alert">{voiceError}</p>}
            {isListening && <p className="voice-status" aria-live="polite">Listening… Speak now.</p>}
            <div>
               <p className="bottom-info">
                Gemini may display inaccurate info, including about people, places, or facts so double-check its responses.Your privacy and Gemini Apps.
               </p>
            </div>
        </div>
      </div>
    </div>
  )
}

export default Main