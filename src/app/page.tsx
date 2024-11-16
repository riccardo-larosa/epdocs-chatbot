import Image from "next/image";
import NavBar from "./components/navbar";

export default function Home() {
  return (
<div>
      <NavBar />
      <div className='overview-text'>

        <h1 style={{ fontWeight: 'bold', fontSize: '2em' }}>Chatbot for EP Docs</h1>
        <br />
        
        
      </div>
    </div>
  );
}
