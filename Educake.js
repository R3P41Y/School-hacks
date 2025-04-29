(async function() {
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

    createAnswerBox("⏳ Grabbing answers... hold up...");

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

    function createAnswerBox(msg) {
        if (document.getElementById("answerBox")) return;

        let style = document.createElement("style");
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
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
                box-shadow: 0 0 15px #ff0000;
                font-family: 'Share Tech Mono', monospace;
                font-size: 14px;
                z-index: 9999;
                display: none;
                backdrop-filter: blur(5px);
                border: 2px solid #aa0000;
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
                color: #ffcccc;
                text-align: center;
            }
        `;
        document.head.appendChild(style);

        let box = document.createElement("div");
        box.id = "answerBox";

        let content = document.createElement("div");
        content.id = "answerContent";
        content.innerHTML = msg;

        let close = document.createElement("button");
        close.innerText = "Close";
        close.onclick = () => { box.style.display = "none"; };

        let credit = document.createElement("div");
        credit.id = "answerFooter";
        credit.innerHTML = "Made with a lot of 🍪 by <b>R3PL4Y</b>";

        box.appendChild(content);
        box.appendChild(close);
        box.appendChild(credit);
        document.body.appendChild(box);

        let toggle = document.createElement("button");
        toggle.id = "toggleButton";
        toggle.innerText = "👁 Show Answers";
        toggle.onclick = () => {
            if (box.style.display === "none") {
                box.style.display = "block";
                toggle.innerText = "🙈 Hide Answers";
            } else {
                box.style.display = "none";
                toggle.innerText = "👁 Show Answers";
            }
        };

        document.body.appendChild(toggle);
    }

    function updateAnswerBox(content) {
        let target = document.getElementById("answerContent");
        if (target) target.innerHTML = content;
    }
})();
