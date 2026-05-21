export interface User {
  name: string;
  age: number;
  gender: "male" | "female";
  school: string;
  major: string;
  bankAccountHolder: string;
}

export interface Music {
  id: string;
  title: string;
  artist: string;
  genre: string;
  imageUrl: string;
  duration: string;
}

export interface Match {
  id: string;
  user: User;
  commonGenre: string;
  status: "pending" | "accepted" | "rejected";
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
}
