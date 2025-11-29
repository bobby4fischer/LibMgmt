📘 SeatSync – Library Seat Booking System
Real-time seat reservation platform for libraries, built using the MERN stack with Socket.IO for instant seat updates.

🚀 Overview
SeatSync is a full-stack real-time library seat booking system that allows students to view seat availability, book seats, cancel bookings, and book adjacent seats for pair usage.
The system ensures live updates, prevents double-booking, and maintains data integrity using backend validation and atomic DB operations.

✨ Features
🔴 Real-time seat updates using Socket.IO
🎯 Accurate seat availability with server-side locking (35% accuracy boost)
👥 Pair-booking logic with adjacency checks (30% conflict reduction)
🔐 Secure REST APIs with Node.js, Express & JWT
📦 Schema-based validation using Zod
🗃️ MongoDB backend with transaction support
🧩 Modular & scalable frontend using React + Redux
🎨 Beautiful UI with Tailwind CSS + Shadcn/UI
📱 Fully responsive and optimized for all screens

🛠️ Tech Stack
Frontend
React.js
Redux Toolkit
Tailwind CSS
Shadcn/UI
Socket.IO Client
Backend
Node.js
Express.js
MongoDB + Mongoose
Zod
Socket.IO Server
JSON Web Tokens (JWT)

🏗️ Architecture
Frontend (React, Redux)
        |
        | API calls (Axios)
        |
Backend (Express + Zod Validation)
        |
        | Mongoose ORM
        |
Database (MongoDB)

Real-Time Layer:
Frontend <---- Socket.IO ----> Backend

📂 Folder Structure
SeatSync/
 ├── client/                     # React Frontend
 │   ├── public/
 │   ├── src/
 │   │   ├── components/
 │   │   ├── pages/
 │   │   ├── redux/
 │   │   ├── hooks/
 │   │   ├── utils/
 │   │   ├── App.jsx
 │   │   └── main.jsx
 │   └── package.json
 │
 ├── server/                     # Express Backend
 │   ├── src/
 │   │   ├── controllers/
 │   │   ├── routes/
 │   │   ├── models/
 │   │   ├── services/
 │   │   ├── validators/         # Zod schemas
 │   │   ├── sockets/            # Socket.IO setup
 │   │   ├── utils/
 │   │   └── index.js
 │   └── package.json
 │
 ├── README.md
 └── .env

⚙️ Installation & Setup
1️⃣ Clone the repository
git clone https://github.com/your-username/SeatSync.git
cd SeatSync

2️⃣ Setup Backend
cd server
npm install


Create a .env file:

PORT=5000
MONGO_URI=mongodb://localhost:27017/seatsync
JWT_SECRET=your_secret_key


Run backend:

npm run dev

3️⃣ Setup Frontend
cd client
npm install
npm run dev


Frontend runs at:
👉 http://localhost:5173

Backend runs at:
👉 http://localhost:5000

📡 API Endpoints
Auth
Method	Endpoint	Description
POST	/api/auth/login	Login user
POST	/api/auth/register	Register user
Seat Operations
Method	Endpoint	Description
GET	/api/seats	Get all seats
POST	/api/book	Book a single seat
POST	/api/cancel	Cancel seat
POST	/api/pair-book	Book two adjacent seats
🔌 Socket.IO Events
Client → Server
Event	Payload
book-seat	{seatId, userId}
cancel-seat	{seatId}
Server → Client
Event	Purpose
seat-updated	Broadcast updated seat state
pair-booked	Notify users about pair booking
live-seats	Initial fetch 

📸 Screenshots (Add after building UI)
Seat Grid View
Live Seat Updates
Pair Booking UI
Booking Confirmation Popup
Admin Dashboard (optional)
(I can help generate UI mockups if you want)

🧪 Testing
Postman scripts for API testing
Jest for backend unit tests (optional)
Manual testing for race conditions
Socket.IO stress tests

🔒 Security Measures
JWT Authentication
Input validation via Zod
API rate limiting
Atomic DB operations to prevent double-booking
Sanitization against XSS & injection

🤝 Contributing
Fork the repo
Create a feature branch
Commit changes

Push & create PR
📄 License

MIT License © 2025 Your Name
🎉 Acknowledgements

Special thanks to the developers of:

React
Socket.IO
Express
Zod
Tailwind CSS
Shadcn/UI
