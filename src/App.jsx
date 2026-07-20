import { Routes, Route } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import Footer from "./components/Footer.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import Landing from "./pages/Landing.jsx";
import Quiver from "./pages/Quiver.jsx";
import RepoDetail from "./pages/RepoDetail.jsx";
import Portfolio from "./pages/Portfolio.jsx";
import CliConnect from "./pages/CliConnect.jsx";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/quiver" element={<Quiver />} />
          <Route path="/repo/:id" element={<RepoDetail />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/cli" element={<CliConnect />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
