import { io } from "socket.io-client";
const URL = "https://discord.api.tawerdev.ru";

export const socket = io(URL);
