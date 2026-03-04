import React from "react";

function Footer() {
  return (
    <footer className="bg-dark text-white text-center py-3 mt-auto">
      <div className="container">
        <small>&copy; {new Date().getFullYear()} College ERP System. All rights reserved.</small>
      </div>
    </footer>
  );
}

export default Footer;
