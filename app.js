const loginScreen = document.getElementById("loginScreen");
const chatScreen = document.getElementById("chatScreen");
const loginForm = document.getElementById("loginForm");
const messageForm = document.getElementById("messageForm");
const logoutBtn = document.getElementById("logoutBtn");
const messageInput = document.getElementById("messageInput");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginError = document.getElementById("loginError");
const messagesContainer = document.getElementById("messagesContainer");
const onlineUsers = document.getElementById("onlineUsers");
const chatTitle = document.getElementById("chatTitle");

const PASSWORD = "Suii";
const STORAGE_KEY = "mayajaal_chat_user";
const DB = firebase.database();

let currentUser = null;
let messagesRef = null;

function showScreen(screen) {
  loginScreen.classList.toggle("active", screen === "login");
  chatScreen.classList.toggle("active", screen === "chat");
}

function setLoginError(msg) {
  loginError.textContent = msg;
}

function saveUser(userName) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: userName }));
}

function loadUser() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;

  try {
    return JSON.parse(saved).name || null;
  } catch {
    return null;
  }
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function createMessageRow(message) {
  const row = document.createElement("div");
  row.className = `message-row ${message.sender === currentUser ? "me" : "other"}`;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  if (message.sender !== currentUser) {
    const name = document.createElement("span");
    name.className = "sender-name";
    name.textContent = message.sender;
    bubble.appendChild(name);
  }

  const text = document.createElement("div");
  text.className = "message-text";
  text.textContent = message.text;
  bubble.appendChild(text);

  const time = document.createElement("span");
  time.className = "message-time";
  time.textContent = formatTime(message.createdAt);
  bubble.appendChild(time);

  row.appendChild(bubble);
  return row;
}

function renderMessages(snapshot) {
  messagesContainer.innerHTML = "";

  if (!snapshot || !snapshot.val()) {
    const systemMsg = document.createElement("div");
    systemMsg.className = "system-msg";
    systemMsg.textContent = "No messages yet. Say hello!";
    messagesContainer.appendChild(systemMsg);
    return;
  }

  const messages = Object.values(snapshot.val());

  messages.forEach((message) => {
    const row = createMessageRow(message);
    messagesContainer.appendChild(row);
  });

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateOnlineUsers(snapshot) {
  const users = snapshot.val() || {};
  const names = Object.keys(users)
    .filter((name) => users[name]?.online)
    .map((name) => name);

  if (!names.length) {
    onlineUsers.textContent = "No one else is online right now.";
    return;
  }

  onlineUsers.textContent = "Online: " + names.join(", ");
}

function loginUser(name, password) {
  if (!name || !password) {
    setLoginError("Please enter your name and password.");
    return;
  }

  if (password !== PASSWORD) {
    setLoginError("Incorrect password. The app password is Suii.");
    return;
  }

  currentUser = name.trim();

  saveUser(currentUser);
  chatTitle.textContent = `${currentUser}'s Chat`;
  showScreen("chat");

  setLoginError("");
  messageInput.focus();

  messagesRef = DB.ref("messages");
  const presenceRef = DB.ref("presence/" + currentUser);

  presenceRef.set({
    online: true,
    lastSeen: Date.now()
  });

  presenceRef.onDisconnect().remove();

  const presenceList = DB.ref("presence");
  presenceList.on("value", updateOnlineUsers);

  messagesRef.on("value", renderMessages);
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  loginUser(name, password);
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!currentUser) return;

  const messageText = messageInput.value.trim();
  if (!messageText) return;

  const message = {
    sender: currentUser,
    text: messageText,
    createdAt: new Date().toISOString()
  };

  DB.ref("messages").push(message);
  messageInput.value = "";
  messageInput.focus();
});

logoutBtn.addEventListener("click", () => {
  if (!currentUser) return;

  const presenceRef = DB.ref("presence/" + currentUser);
  presenceRef.remove();

  if (messagesRef) {
    messagesRef.off("value", renderMessages);
  }

  const presenceList = DB.ref("presence");
  presenceList.off("value", updateOnlineUsers);

  currentUser = null;
  localStorage.removeItem(STORAGE_KEY);

  showScreen("login");
  loginForm.reset();
  messagesContainer.innerHTML = "";
  onlineUsers.textContent = "";
  usernameInput.focus();
});

function restoreSession() {
  const savedUser = loadUser();
  if (!savedUser) {
    showScreen("login");
    usernameInput.focus();
    return;
  }

  loginUser(savedUser, PASSWORD);
}

restoreSession();
