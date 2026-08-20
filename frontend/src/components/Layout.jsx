import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">

      <Navbar />

      <div className="flex">
        <Sidebar />

        <main className="flex-1 min-h-[calc(100vh-4rem)] p-6 bg-gray-50 dark:bg-gray-950 transition-colors">
          <Outlet />
        </main>
      </div>

    </div>
  );
}

export default Layout;