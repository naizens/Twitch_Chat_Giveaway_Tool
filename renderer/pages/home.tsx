import { useEffect, useState, useRef } from "react";

export default function Home() {
	const [messages, setMessages] = useState<
		{ username: string; message: string }[]
	>([]);
	const [isMonitoring, setIsMonitoring] = useState(false);
	const [keyword, setKeyword] = useState("");
	const [channel, setChannel] = useState(""); // Default-Channel
	const [matchingUsers, setMatchingUsers] = useState<string[]>([]);
	const [selectedUser, setSelectedUser] = useState<string | null>(null);
	const [isConnected, setIsConnected] = useState(false); // Status für Verbindung

	const chatBoxRef = useRef<HTMLDivElement>(null);
	const wsRef = useRef<WebSocket | null>(null);

	const connectToChannel = () => {
		if (wsRef.current) {
			wsRef.current.close(); // Schließt die bestehende Verbindung, falls vorhanden
		}

		const ws = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
		wsRef.current = ws;

		ws.onopen = function () {
			console.log("Connected to chat");
			ws.send("PASS oauth:your_oauth_token"); // Ersetze 'your_oauth_token' mit deinem tatsächlichen Token
			ws.send("NICK justinfan12345"); // Anonymer Benutzername für Testzwecke
			ws.send(`JOIN #${channel}`); // Kanal beitreten
			setIsConnected(true); // Setze den Verbindungsstatus auf verbunden
		};

		ws.onmessage = function (event) {
			const data = event.data;
			console.log("Received data: ", data);

			if (data.includes("PRIVMSG")) {
				const messagePattern =
					/:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #\w+ :(.+)/;
				const match = data.match(messagePattern);

				if (match) {
					const username = match[1];
					const message = match[2];

					setMessages((prevMessages) => [
						...prevMessages,
						{ username, message },
					]);

					if (isMonitoring && keyword) {
						const escapedKeyword = keyword.replace(
							/[.*+?^${}()|[\]\\]/g,
							"\\$&"
						);
						const keywordPattern = new RegExp(`^${escapedKeyword}$`, "i");

						if (keywordPattern.test(message)) {
							setMatchingUsers((prevUsers) => {
								if (!prevUsers.includes(username)) {
									return [...prevUsers, username];
								}
								return prevUsers;
							});
						}
					}
				}
			}
		};

		ws.onerror = function (error: Event) {
			const event = error as ErrorEvent;
			console.error("WebSocket error: ", event.message);
			setIsConnected(false); // Setze den Verbindungsstatus auf nicht verbunden
		};

		ws.onclose = function () {
			console.log("Disconnected from chat");
			setIsConnected(false); // Setze den Verbindungsstatus auf nicht verbunden
		};
	};

	useEffect(() => {
		return () => {
			if (wsRef.current) {
				wsRef.current.close(); // Schließt die WebSocket-Verbindung bei Komponentenausgang
			}
		};
	}, []);

	useEffect(() => {
		if (chatBoxRef.current) {
			chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
		}
	}, [messages]);

	useEffect(() => {
		if (isMonitoring && keyword && isConnected) {
			// Filter auf neue Nachrichten anwenden
			const currentMessages = [...messages]; // Kopie der aktuellen Nachrichten
			const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const keywordPattern = new RegExp(`^${escapedKeyword}$`, "i");

			const filteredUsers = currentMessages
				.filter((msg) => keywordPattern.test(msg.message))
				.map((msg) => msg.username);

			setMatchingUsers(
				filteredUsers.filter((user, index, arr) => arr.indexOf(user) === index)
			);
		}
	}, [isMonitoring, keyword, messages, isConnected]);

	const handleStart = () => {
		if (isConnected) {
			handleClearChat(); // Lösche den Chatverlauf
			setMatchingUsers([]); // Setze die Benutzerliste zurück
			setIsMonitoring(true);
		}
	};

	const handleStop = () => {
		setIsMonitoring(false);
	};

	const handleRoll = () => {
		if (matchingUsers.length > 0) {
			const randomIndex = Math.floor(Math.random() * matchingUsers.length);
			const randomUser = matchingUsers[randomIndex];
			setSelectedUser(randomUser);
		}
	};

	const handleChannelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setChannel(e.target.value);
	};

	const handleConnect = () => {
		connectToChannel();
	};

	const handleClearChat = () => {
		setMessages([]); // Setzt die Nachrichten auf ein leeres Array zurück
	};

	return (
		<div className="flex flex-col mt-2 gap-y-4 mx-4">
			<h1 className="w-full text-4xl text-center">Auslosungstool</h1>
			<div className="flex flex-col w-full">
				<div className="flex flex-col gap-y-2 w-full">
					<div className="flex gap-x-2 items-center w-full">
						<input
							type="text"
							className="bg-slate-300 text-slate-800 font-bold py-2 px-4 rounded inline-flex items-center placeholder:text-slate-400 transition-all duration-500"
							placeholder="Channel"
							value={channel}
							onChange={handleChannelChange}
						/>
						<button
							onClick={handleConnect}
							className="bg-slate-300 hover:bg-slate-400 hover:text-slate-800 text-slate-700 font-bold py-2 px-4 rounded inline-flex items-center transition-all duration-500"
						>
							Connect
						</button>
						{isConnected && (
							<span
								className=" right-2 text-green-500 text-xl"
								role="img"
								aria-label="Connected"
							>
								✔️
							</span>
						)}
					</div>
					<div className="flex gap-x-2 w-full">
						<input
							type="text"
							className="bg-slate-300  text-slate-800 font-bold py-2 px-4 rounded inline-flex items-center placeholder:text-slate-400 transition-all duration-500"
							placeholder="Keyword"
							value={keyword}
							onChange={(e) => setKeyword(e.target.value)}
						/>
						<button
							onClick={handleStart}
							className="bg-slate-300 hover:bg-slate-400 hover:text-slate-800 text-slate-700 font-bold py-2 px-4 rounded inline-flex items-center transition-all duration-500"
							disabled={!isConnected} // Deaktiviert den Start-Button, wenn nicht verbunden
						>
							Start
						</button>
						<button
							onClick={handleStop}
							className="bg-slate-300 hover:bg-slate-400 hover:text-slate-800 text-slate-700 font-bold py-2 px-4 rounded inline-flex items-center transition-all duration-500"
						>
							Stop
						</button>
						<button
							onClick={handleRoll}
							className="bg-slate-300 hover:bg-slate-400 hover:text-slate-800 text-slate-700 font-bold py-2 px-4 rounded inline-flex items-center transition-all duration-500"
						>
							Roll
						</button>
						<button
							onClick={handleClearChat}
							className="bg-slate-300 hover:bg-slate-400 hover:text-slate-600 text-slate-800 font-bold py-2 px-4 rounded inline-flex items-center transition-all duration-500"
						>
							Clear Chat
						</button>
					</div>
				</div>
			</div>
			<div className="flex border rounded-md p-4 gap-x-4">
				<div
					className="w-2/3 flex flex-col max-h-96 overflow-y-auto overflow-x-hidden box-border"
					id="chat-box"
					ref={chatBoxRef}
				>
					<h1 className="w-full h-fit sticky top-0 bg-slate-900 z-50 text-center text-xl font-semibold">
						Chat
					</h1>
					<div className="flex flex-col">
						{messages.map((msg, index) => (
							<p key={index}>
								<strong>{msg.username}:</strong> {msg.message}
							</p>
						))}
					</div>
				</div>
				<div className="w-1/3" id="entry-list">
					<h1 className="w-full h-fit sticky top-0 bg-slate-900 z-50 text-center text-xl font-semibold">
						Entrys
					</h1>
					<div className="flex flex-col">
						{matchingUsers.map((user, index) => (
							<p key={index}>{user}</p>
						))}
					</div>
					{selectedUser && (
						<div className="mt-4">
							<h2 className="text-xl text-center">Selected User</h2>
							<p className="text-center font-bold">{selectedUser}</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
