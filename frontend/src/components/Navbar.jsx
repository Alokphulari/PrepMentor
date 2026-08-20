function Navbar() {
  return (
    <nav className="h-16 bg-white border-b flex items-center justify-between px-6">

      <div className="text-2xl font-bold text-blue-600">
        PrepMentor
      </div>

      <div className="flex items-center gap-4">
        <span className="text-gray-700">
          Alok
        </span>

        <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center">
          A
        </div>
      </div>

    </nav>
  );
}

export default Navbar;