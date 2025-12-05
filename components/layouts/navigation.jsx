import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, useCallback } from "react";

const Navigation = ({ page }) => {
  const router = useRouter();
  const [isSticky, setSticky] = useState(false);

  const handleScroll = useCallback(() => {
    setSticky(window.scrollY >= 70);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  // Determine current route for highlighting
  const pathname = router.pathname;
  const isIndexGrid = pathname === "/index-grid";
  const isIndexList = pathname === "/index-list";
  const isIndex = isIndexGrid || isIndexList;
  // Home is only "/" and not index-grid or index-list

  return (
    <>
      <header
        className="z-[999] w-full fixed bottom-0 left-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0)_5%,rgba(255,255,255,0.8)_80%)] sm:bg-none"
        id="mainnavigationBar"
      >
        <nav className="container-fluid flex flex-row justify-between items-center text-xs uppercase tracking-widest">
          <Link
            href="/"
            className={`leading-none py-4 pl-4`}
          >
            ADAM RIDING
          </Link>
          {/* INDEX nav item with Grid/List options */}
          <span className="py-4 relative flex flex-row items-end ">
            <Link
              href="/index-grid"
              className={`text-xs uppercase tracking-widest`}
              style={{ marginRight: 4 }}
            >
              INDEX
            </Link>
            {/* Reserve space for grid/list always, but only show links when on index */}
            <span
              className="py-4  ml-1 flex flex-row items-center hidden sm:inline-flex"
              style={{
                minWidth: "90px", // enough for "- Grid, List"
                visibility: isIndex ? "visible" : "hidden",
                opacity: isIndex ? 1 : 0,
                transition: "opacity 0.2s",
              }}
            >
              <Link
                href="/index-grid"
                className={`ml-1 text-xs uppercase tracking-widest ${
                  isIndexGrid ? "text-black/80" : "text-black/40"
                }`}
              >
                Grid
              </Link>
              <span className="text-xs text-black/40">,</span>
              <Link
                href="/index-list"
                className={`ml-1 text-xs uppercase tracking-widest ${
                  isIndexList ? "text-black/80" : "text-black/40"
                }`}
              >
                List
              </Link>
            </span>
          </span>
          <Link
            href="/archive"
            className={`py-4 text-xs uppercase tracking-widest`}
          >
            ARCHIVE
          </Link>
          <Link
            href="/contact"
            className={`py-4 pr-4 text-xs uppercase tracking-widest`}
          >
            CONTACT
          </Link>
        </nav>
      </header>
    </>
  );
};

export default Navigation;
