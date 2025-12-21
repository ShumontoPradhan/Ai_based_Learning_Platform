// <!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8">
//   <title>Assignment Submission</title>
//   <link href="https://fonts.googleapis.com/css?family=Inter:400,600&display=swap" rel="stylesheet">
//   <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
//   <style>
//     body {
//       background: linear-gradient(120deg, #f9fafc 40%, #e5eeff 100%);
//       font-family: 'Inter', sans-serif;
//       color: #21232a;
//       min-height: 100vh;
//       margin: 0;
//       padding: 0;
//       box-sizing: border-box;
//       overflow-x: hidden;
//     }
//     .header {
//       background: #fff;
//       box-shadow: 0 2px 10px rgba(50,50,80,.07);
//       padding: 28px 0 24px 0;
//       display: flex;
//       align-items: center;
//       justify-content: space-between;
//       width: 100%;
//       position: sticky;
//       top: 0;
//       z-index: 10;
//       animation: fadeIn 0.6s;
//     }
//     @keyframes fadeIn {
//       from { opacity:0; transform:translateY(-30px);} 
//       to { opacity:1; transform:translateY(0);}
//     }
//     .title {
//       font-size: 2.25rem;
//       font-weight: 700;
//       letter-spacing: 1.2px;
//       color: #4764ff;
//     }
//     .container {
//       margin: 48px auto;
//       max-width: 950px;
//       display: flex;
//       flex-wrap: wrap;
//       gap: 38px;
//       justify-content: center;
//     }
//     .panel {
//       background: #fff;
//       border-radius: 22px;
//       box-shadow: 0 8px 32px rgba(36,50,180,0.07);
//       padding: 32px 30px;
//       flex: 1 1 340px;
//       min-width: 320px;
//       opacity: 0;
//       transform: translateY(40px);
//       animation: panelIn 0.8s cubic-bezier(.18,.75,.39,1.09) forwards;
//     }
//     .panel:nth-child(1) { animation-delay: .1s;}
//     .panel:nth-child(2) { animation-delay: .28s;}
//     .panel:nth-child(3) { animation-delay: .46s;}
//     @keyframes panelIn {
//       to { opacity:1; transform:translateY(0);}
//     }
//     .instructions {
//       font-size: 1.05rem;
//       color: #555;
//       margin-bottom: 18px;
//       display: flex; align-items: center;
//       gap: 8px;
//       font-weight: 500;
//     }
//     .instructions .material-icons { color: #36bb6e;}
//     .due-date {
//       font-size: 0.98rem;
//       color: #bd780a;
//       font-weight: 600;
//       margin-bottom: 24px;
//       letter-spacing: .012em;
//     }
//     .upload-section {
//       display: flex;
//       flex-direction: column;
//       align-items: center;
//       border: 2px dashed #bdbdbd;
//       border-radius: 15px;
//       padding: 26px 0;
//       background: #f8fbff;
//       margin-bottom: 16px;
//       transition: box-shadow .2s, background .25s;
//     }
//     .upload-section:hover {
//       background: #eaf2ff;
//       box-shadow: 0 2px 12px rgba(64,120,247,0.09);
//     }
//     .upload-section input[type="file"] {
//       margin-top: 12px;
//     }
//     .upload-section label {
//       font-size:1.1rem; font-weight:600; margin-bottom:7px;
//     }
//     .upload-section span {
//       color: #aaa;
//       margin:8px 0 4px 0;
//     }
//     .upload-section textarea {
//       width: 90%; margin-top: 8px;
//       border-radius: 10px; border: 1.5px solid #b3c4ee;
//       padding: 10px; font-size:1rem;
//       box-shadow: 0 1px 4px rgba(64,120,247,.05);
//       transition: border-color .2s;
//     }
//     .upload-section textarea:focus {
//       border-color: #4078f7;
//       outline: none;
//     }
//     button {
//       padding: 13px 32px;
//       border: none;
//       background: linear-gradient(90deg,#4764ff 40%, #5acfff 100%);
//       color: #fff;
//       font-weight: 700;
//       border-radius: 10px;
//       cursor: pointer;
//       font-size: 1.1rem;
//       margin-top: 18px;
//       box-shadow: 0 2px 18px rgba(52,103,240,.09);
//       transition: background .2s, box-shadow .2s, transform .15s;
//     }
//     button:hover {
//       background: linear-gradient(90deg,#5acfff 0%, #4764ff 90%);
//       transform:translateY(-1px) scale(1.04);
//       box-shadow: 0 4px 28px rgba(64,120,247,.17);
//     }
//     .feedback {
//       margin-bottom: 12px;
//     }
//     .feedback .score {
//       font-size: 1.5rem;
//       color: #3bb273;
//       font-weight: 800;
//       margin-bottom: 10px;
//       text-shadow: 0 2px 8px #e7faee;
//       display: flex; align-items:center; gap:7px;
//     }
//     .feedback .material-icons { color:#4078f7;}
//     .feedback .highlights, .feedback .improvements {
//       margin-bottom: 12px;
//     }
//     .feedback ul {
//       margin: 0 0 6px 16px;
//       padding: 0;
//       font-size: 1rem;
//     }
//     .feedback li {
//       margin-bottom: 4px;
//       opacity:.88;
//     }
//     .improvements {
//       color: #d4841c;
//       font-weight: 600;
//     }
//     .improvements a {
//       color: #4078f7;
//       text-decoration: underline;
//       font-size: .97rem;
//       margin-left:8px;
//       transition: color .15s;
//     }
//     .improvements a:hover {
//       color: #36bb6e;
//     }
//     .progress-card {
//       background: linear-gradient(90deg,#f9fcfe 70%, #d4e1fb 100%);
//       border-radius: 22px;
//       box-shadow: 0 1px 10px rgba(60,100,250,.06);
//       padding: 22px;
//       margin-top: 6px;
//       text-align: center;
//       animation: fadeIn 0.7s .48s backwards;
//     }
//     .progress-card .bar {
//       background: #dee9f5;
//       border-radius: 10px;
//       height: 13px;
//       width: 92%;
//       margin: 14px auto 12px auto;
//       overflow: hidden;
//       position: relative;
//       box-shadow: 0 1px 6px #e6eefd;
//     }
//     .progress-card .bar-inner {
//       background: linear-gradient(90deg,#5acfff 10%,#4764ff 90%);
//       height: 100%;
//       border-radius: 10px;
//       width: 0; /* Start at 0 for animation */
//       position: absolute;
//       left: 0;
//       top: 0;
//       transition: width 1.3s cubic-bezier(.18,.75,.39,1.09);
//     }
//     .progress-card.active .bar-inner {
//       width: 65%; /* Fill up for progress */
//     }
//     .progress-card span {
//       color: #4764ff; font-weight: 500; font-size:1.07rem; letter-spacing:.01em;
//     }
//   </style>
//   <script>
//     window.onload = function() {
//       document.querySelector('.progress-card').classList.add('active');
//     }
//   </script>
// </head>
// <body>
//   <div class="header">
//     <div class="title">Assignment Submission</div>
//     <div><span class="material-icons" style="vertical-align:middle;">account_circle</span> User Name</div>
//   </div>
//   <div class="container">
//     <!-- Left panel: Assignment Details & Upload -->
//     <div class="panel">
//       <div class="instructions"><span class="material-icons">assignment</span> <strong>Instructions:</strong> Solve all the problems. You can upload a file or type your answer below.</div>
//       <div class="due-date"><strong>Due:</strong> Nov 20, 2025</div>
//       <div class="upload-section">
//         <label><span class="material-icons">cloud_upload</span> Upload your assignment:</label>
//         <input type="file">
//         <span>or</span>
//         <textarea rows="5" placeholder="Type your answer here..."></textarea>
//         <button><span class="material-icons" style="vertical-align:middle;font-size:1.12em;">send</span> Submit</button>
//       </div>
//     </div>
//     <!-- Right panel: AI Feedback -->
//     <div class="panel">
//       <div class="feedback">
//         <div class="score"><span class="material-icons">auto_fix_high</span> AI Score: 8/10</div>
//         <div class="highlights">
//           <strong>Strengths:</strong>
//           <ul>
//             <li>Clear explanation of concepts</li>
//             <li>Accurate calculations</li>
//           </ul>
//         </div>
//         <div class="improvements">
//           <strong>Areas to Improve:</strong>
//           <ul>
//             <li>Add more examples in Question 2</li>
//             <li>Review grammar in conclusion</li>
//           </ul>
//           <a href="#"><span class="material-icons" style="font-size:1em;vertical-align:middle;">menu_book</span> Learn grammar basics</a>
//         </div>
//       </div>
//     </div>
//     <!-- Progress Card -->
//     <div class="progress-card panel">
//       <strong><span class="material-icons">trending_up</span> Progress</strong>
//       <div class="bar">
//         <div class="bar-inner"></div>
//       </div>
//       <span>You're getting better! Last score: 6/10</span>
//     </div>
//   </div>
// </body>
// </html>
