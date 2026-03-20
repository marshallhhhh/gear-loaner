import Navbar from './Navbar.jsx';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">{children}</main>

      <footer className="text-center text-xs text-gray-400 py-4 border-t">
        Tas University Mountaineering Club — Gear Management System
      </footer>
    </div>
  );
}
