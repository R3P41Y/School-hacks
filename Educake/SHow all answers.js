(async function() {
    function createPasswordPrompt() {
        // Create the modal
        const modal = document.createElement("div");
        modal.id = "passwordModal";
        modal.style.position = "fixed";
        modal.style.top = "0";
        modal.style.left = "0";
        modal.style.width = "100vw";
        modal.style.height = "100vh";
        modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        modal.style.display = "flex";
        modal.style.justifyContent = "center";
        modal.style.alignItems = "center";
        modal.style.zIndex = "10000";
        modal.style.color = "white";
        modal.style.fontFamily = "'Share Tech Mono', monospace";
        
        const modalContent = document.createElement("div");
        modalContent.style.backgroundColor = "#333";
        modalContent.style.padding = "20px";
        modalContent.style.borderRadius = "10px";
        modalContent.style.textAlign = "center";
        
        const modalText = document.createElement("h2");
        modalText.innerText = "Enter Password:";
        
        const passwordInput = document.createElement("input");
        passwordInput.type = "password";
        passwordInput.style.padding = "10px";
        passwordInput.style.marginTop = "10px";
        passwordInput.style.fontSize = "16px";
        passwordInput.style.border = "none";
        passwordInput.style.borderRadius = "5px";
        passwordInput.style.width = "250px";
        
        const submitButton = document.createElement("button");
        submitButton.innerText = "Submit";
        submitButton.style.marginTop = "10px";
        submitButton.style.padding = "10px 20px";
        submitButton.style.border = "none";
        submitButton.style.borderRadius = "5px";
        submitButton.style.cursor = "pointer";
        submitButton.style.backgroundColor = "#ff1e1e";
        submitButton.style.color = "white";
        
        modalContent.appendChild(modalText);
        modalContent.appendChild(passwordInput);
        modalContent.appendChild(submitButton);
        modal.appendChild(modalContent);
        
        document.body.appendChild(modal);
        
        // Password verification
        submitButton.onclick = function() {
            const enteredPassword = passwordInput.value;
            const correctPassword = "r00t";
            
            if (enteredPassword === correctPassword) {
                modal.style.display = "none";  // Close modal if password is correct
                startApp(); // Proceed with the rest of the app
            } else {
                alert("Incorrect password! The tab will now close.");
                window.close(); // Close the tab if password is incorrect
            }
        };
    }

    // Function to start the rest of the app after password is correct
    async function startApp() {
        let authToken = sessionStorage.getItem("token");

        function getXsrfToken() {
            let match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
            return match ? decodeURIComponent(match[1]) : null;
        }

        let xsrfToken = getXsrfToken();

        if (!authToken || !xsrfToken) {
            alert("Missing auth or XSRF token. Make sure you're logged in.");
            return;
        }

        let match = window.location.pathname.match(/quiz\/(\d+)/);
        if (!match) {
            alert("You need to be on a quiz page!");
            return;
        }

        let quizId = match[1];
        console.log("Quiz ID:", quizId);
        console.log("Auth Token:", authToken);
        console.log("XSRF Token:", xsrfToken);

        createLoadingScreen();
        createAnswerBox("⏳ Grabbing answers...");

        try {
            let quizResponse = await fetch(`https://my.educake.co.uk/api/student/quiz/${quizId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json;version=2',
                    'Authorization': `Bearer ${authToken}`,
                    'X-XSRF-TOKEN': xsrfToken
                }
            });

            if (!quizResponse.ok) throw new Error("Failed to fetch quiz.");

            let quizData = await quizResponse.json();
            let questionIds = quizData.attempt[quizId]?.questions;

            if (!questionIds || questionIds.length === 0) {
                updateAnswerBox("No questions found.");
                removeLoadingScreen();
                return;
            }

            let answers = [];

            for (let i = 0; i < questionIds.length; i++) {
                let qID = questionIds[i];
                try {
                    let res = await fetch(`https://my.educake.co.uk/api/course/question/${qID}/mark`, {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json;version=2',
                            'Authorization': `Bearer ${authToken}`,
                            'X-XSRF-TOKEN': xsrfToken,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ "givenAnswer": "1" })
                    });

                    if (!res.ok) continue;

                    let data = await res.json();
                    let correct = data.answer?.correctAnswers?.join(", ");
                    answers.push(`Q${i + 1}: <b>${correct || "No answer"}</b>`);
                } catch (err) {
                    console.warn(`Error on Q${i + 1}:`, err);
                }
            }

            updateAnswerBox(answers.length > 0 ? answers.join("<br><br>") : "No answers retrieved.");
        } catch (error) {
            console.error(error);
            updateAnswerBox("Error fetching data.");
        }

        removeLoadingScreen();
    }

    createPasswordPrompt();

    // === UTILS BELOW === //

    function createLoadingScreen() {
        const style = document.createElement("style");
        style.textContent = `
            @keyframes gradientText {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            #loadingOverlay {
                position: fixed;
                top: 0; left: 0;
                width: 100vw;
                height: 100vh;
                background: black;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99998;
                flex-direction: column;
                color: white;
                font-family: 'Share Tech Mono', monospace;
                transition: opacity 0.5s ease;
            }
            #loadingText {
                font-size: 28px;
                background: linear-gradient(270deg, red, #ff7070, #ff1e1e);
                background-size: 400% 400%;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: gradientText 5s ease infinite;
            }
        `;
        document.head.appendChild(style);

        const overlay = document.createElement("div");
        overlay.id = "loadingOverlay";
        overlay.innerHTML = `<div id="loadingText">Loading Answers...</div>`;
        document.body.appendChild(overlay);

        // Remove loading screen after 5 seconds
        setTimeout(removeLoadingScreen, 5000); // 5000ms = 5 seconds
    }

    function removeLoadingScreen() {
        const overlay = document.getElementById("loadingOverlay");
        if (overlay) {
            overlay.style.opacity = 0;
            setTimeout(() => overlay.remove(), 500);
        }
    }

    function createAnswerBox(msg) {
        if (document.getElementById("answerBox")) return;

        let style = document.createElement("style");
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
            @keyframes pulse {
                0% { box-shadow: 0 0 15px #ff0000; }
                50% { box-shadow: 0 0 30px #ff0000; }
                100% { box-shadow: 0 0 15px #ff0000; }
            }
            #answerBox {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 360px;
                max-height: 400px;
                overflow-y: auto;
                padding: 20px;
                background: linear-gradient(135deg, #7d0e0e, #ff1e1e);
                color: #ffffff;
                border-radius: 12px;
                font-family: 'Share Tech Mono', monospace;
                font-size: 14px;
                z-index: 9999;
                display: none;
                backdrop-filter: blur(5px);
                border: 2px solid #aa0000;
                cursor: move;
                animation: pulse 2s infinite;
            }
            #answerBox button {
                background: #440000;
                color: white;
                border: none;
                padding: 6px 12px;
                margin-top: 10px;
                border-radius: 6px;
                cursor: pointer;
                font-family: 'Share Tech Mono', monospace;
            }
            #toggleButton {
                position: fixed;
                bottom: 20px;
                left: 20px;
                padding: 10px;
                border: none;
                border-radius: 6px;
                background: linear-gradient(135deg, #ff1e1e, #7d0e0e);
                color: #fff;
                font-family: 'Share Tech Mono', monospace;
                cursor: pointer;
                z-index: 9999;
                box-shadow: 0 0 10px #ff0000;
            }
            #answerFooter {
                margin-top: 15px;
                font-size: 10px;
                text-align: center;
            }
        `;
        document.head.appendChild(style);

        const answerBox = document.createElement("div");
        answerBox.id = "answerBox";
        answerBox.innerHTML = `
            <div id="answerContent">${msg}</div>
            <div id="answerFooter">Powered by R3PL4Y</div>
        `;
        document.body.appendChild(answerBox);
        answerBox.style.display = "block";
    }

    function updateAnswerBox(msg) {
        const content = document.getElementById("answerContent");
        if (content) {
            content.innerHTML = msg;
        }
    }

    const toggleButton = document.createElement("button");
    toggleButton.id = "toggleButton";
    toggleButton.innerText = "Toggle Answer Box";
    toggleButton.onclick = () => {
        const answerBox = document.getElementById("answerBox");
        if (answerBox) {
            answerBox.style.display = answerBox.style.display === "none" ? "block" : "none";
        }
    };
    document.body.appendChild(toggleButton);
})();
