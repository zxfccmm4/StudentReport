# Student Report

This is a simple web application to display student reports from a CSV file.

## Features

*   Displays student data from a CSV file.
*   Provides an API endpoint to fetch student data.
*   Serves a frontend to visualize the data.

## Tech Stack

*   **Frontend:** HTML, CSS, JavaScript
*   **Backend:** Node.js, Express.js

## Prerequisites

*   Node.js and npm

## Installation & Setup

1.  Clone the repository.
2.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```

## Running the Application

You can use the provided start script:

```bash
./start.sh
```

Alternatively, you can run the application manually:

1.  Navigate to the `backend` directory.
2.  Start the server:
    ```bash
    npm start
    ```
3.  Open your browser and go to [http://localhost:7788](http://localhost:7788).

## Usage

### Downloading Excel Template

You can download the Excel template directly from the application's interface. This template is located in the project's root directory as `学生成绩报告单模板.xlsx`.

## Project Structure

```
.
├── backend/
│   ├── node_modules/
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
├── frontend/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│   └── index.html
├── .gitignore
├── README.md
├── 学生成绩报告单模板.xlsx
└── start.sh
```

## API Endpoints

*   `GET /api/students`: Returns a list of students from the `sample_student_data.csv` file.
*   `GET /download/excel-template`: Downloads the `学生成绩报告单模板.xlsx` file.

## Data

The sample student data is located in the root directory in the file `sample_student_data.csv`.