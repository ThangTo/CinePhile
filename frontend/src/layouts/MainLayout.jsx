import { Outlet } from "react-router-dom";
import Header from "components/general/Header";
import SiteFooter from "components/general/SiteFooter";

const MainLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
};

export default MainLayout;
