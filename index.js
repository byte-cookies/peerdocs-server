import WebSocket, { WebSocketServer } from "ws";
import fs from "fs";

// json 파일 저장 경로
const jsonFilePath = "./article.json";
let articleData = [];

function readDataFromFile() {
  try {
    // JSON 파일에서 데이터를 동기적으로 읽기
    const data = fs.readFileSync(jsonFilePath, "utf-8");
    const parsedData = data ? JSON.parse(data) : []; // 데이터가 존재하면 파싱
    console.log("JSON 파일에서 데이터 로드 성공:", parsedData);
    articleData = parsedData;
  } catch (error) {
    // 파일 읽기 오류 처리
    console.error("JSON 파일 읽기 오류:", error);
    articleData = [];
  }
}

readDataFromFile();

function saveDataToFile(data) {
  let existingData = readDataFromFile(); // 기존 데이터를 읽어옵니다.
  if (!Array.isArray(existingData)) {
    existingData = [];
  }

  existingData.push(data); // 새로운 게시글을 추가합니다.

  fs.writeFile(jsonFilePath, JSON.stringify(existingData, null, 2), (error) => {
    if (error) {
      console.error("파일 저장 오류:", error);
    } else {
      console.log("파일 저장 완료");
    }
  });
}

// 게시글 수정
function updateDataInFile(updatedData) {
  const existingData = readDataFromFile(); // 기존 데이터를 읽어옵니다.

  // 게시글 수정: updatedData의 id와 일치하는 항목을 찾아서 수정
  const index = existingData.findIndex(
    (article) => article.id === updatedData.id
  );

  if (index !== -1) {
    existingData[index] = updatedData; // 수정된 게시글로 교체
    fs.writeFile(
      jsonFilePath,
      JSON.stringify(existingData, null, 2),
      (error) => {
        if (error) {
          console.error("파일 수정 오류:", error);
        } else {
          console.log("게시글 수정 완료");
        }
      }
    );
  } else {
    console.log("해당 게시글을 찾을 수 없습니다.");
  }
}

// WebSocket 서버를 생성하고 8080 포트로 연결 대기
const wss = new WebSocketServer({ port: 8080 });

// 연결된 클라이언트를 처리
wss.on("connection", (ws) => {
  console.log("클라이언트가 연결되었습니다.");

  // 클라이언트로부터 메시지를 받았을 때
  ws.on("message", (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString());
      console.log("받은 메시지:", parsedMessage);

      // 액션에 따른 처리
      if (parsedMessage.action === "create_post") {
        const postData = parsedMessage.data;
        // 게시글 아이디는 시간을 기반으로 생성
        const postId = Date.now();

        const post = {
          postId: postId,
          title: postData[0].content[0].text,
          data: postData,
        };

        console.log("새로운 게시글 데이터:", post);
        saveDataToFile(post);
      } else if (parsedMessage.action === "get_post") {
        // 게시글 내용을 클라이언트에게 전송
        console.log("게시글 조회 요청:", parsedMessage);
        const postId = parsedMessage.data;
        const article = articleData.find(
          (article) => Number(article.postId) === postId // 타입 일치 확인
        );
        console.log(article);
        ws.send(JSON.stringify({ action: "post", data: article }));
      } else if (parsedMessage.action === "get_post_list") {
        // 게시글 목록을 클라이언트에게 전송
        readDataFromFile();

        const list = articleData.map((article) => {
          return {
            id: article.postId,
            title: article.title,
          };
        });
        ws.send(JSON.stringify({ action: "post_list", data: list }));
      } else {
        console.log("알 수 없는 액션:", parsedMessage.action);
      }
    } catch (error) {
      console.error("메시지 처리 오류:", error);
    }
  });
});

console.log("WebSocket 서버가 8080 포트에서 실행 중입니다.");
