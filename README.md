# MRU WebRTC Chat Application

A real-time chat application for Muteesa I Royal University with WebRTC capabilities for audio and video communication.

## Features

- Real-time messaging with Socket.IO
- Audio and video calls using WebRTC
- File sharing and media support
- Default groups for University, Faculty, and Department levels
- Timetable management system
- Role-based access control
- Push notifications
- Email notifications
- Mobile-responsive design

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- TURN server for WebRTC
- SMTP server for email notifications
- SSL certificate for HTTPS (production)

## Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/your-username/mru-webrtc.git
cd mru-webrtc
\`\`\`

2. Install dependencies for both client and server:
\`\`\`bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
\`\`\`

3. Configure environment variables:
   - Copy `.env.example` to `.env` in the server directory
   - Update the variables with your configuration

4. Start the development servers:
\`\`\`bash
# Start server (from server directory)
npm run dev

# Start client (from client directory)
npm start
\`\`\`

## Project Structure

\`\`\`
mru-webrtc/
├── client/                 # React frontend
│   ├── public/            # Static files
│   └── src/               # Source files
├── server/                # Node.js backend
│   ├── src/
│   │   ├── middleware/    # Express middleware
│   │   ├── models/       # Mongoose models
│   │   ├── socket/       # Socket.IO handlers
│   │   └── utils/        # Utility functions
│   └── .env              # Environment variables
└── README.md             # Project documentation
\`\`\`

## User Roles

- Admin
- Chancellor
- Vice Chancellor
- Dean
- Head of Department
- Lecturer
- Student
- Bursar
- Academic Registrar
- Dean of Students
- Quality Assurance

## Faculties

1. Faculty of Business and Management
   - Accounting and Finance
   - Business Administration
   - Procurement and Logistics Management
   - Human Resource Management
   - Commerce

2. Faculty of Education
   - Arts and Education
   - Science and Education
   - Business Education

3. Faculty of Science and Technology
   - Information Technology
   - Computer Science
   - Software Engineering
   - Engineering
   - Industrial Art & Design

4. Faculty of Social, Cultural, and Development Studies
   - Development Studies
   - Tourism and Hotel Management
   - Social Work and Administration
   - Mass Communication

## Features by Role

### Admin
- User management
- System configuration
- Access control
- Analytics and monitoring

### Faculty Dean
- Faculty-wide announcements
- Department oversight
- Course management
- Faculty timetable management

### Head of Department
- Department management
- Course allocation
- Department timetable management
- Student oversight

### Lecturer
- Course material sharing
- Online lectures
- Assignment management
- Student communication

### Student
- Access course materials
- Join online lectures
- Submit assignments
- Group discussions

## WebRTC Features

- One-on-one video calls
- Group video conferences
- Screen sharing
- Recording capabilities
- Quality adaptation
- Network resilience

## Security Features

- JWT authentication
- Role-based access control
- End-to-end encryption for calls
- Secure file transfer
- Rate limiting
- Input validation

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email webmaster@mru.ac.ug or create an issue in the repository.
