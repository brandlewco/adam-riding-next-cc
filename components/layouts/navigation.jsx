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
  const isArchive = pathname === "/archive";
  const isContact = pathname === "/contact";
  // Home is only "/" and not index-grid or index-list
  const isHome = pathname === "/" && !isIndex;

  return (
    <>
      <header
        style={{ zIndex: "9999" }}
        className="w-full p-4 absolute bottom-0 left-0"
        id="mainnavigationBar"
      >
        <nav className="container-fluid flex flex-row justify-between text-sm">
          <Link
            href="/"
            className={`leading-none${isHome ? " font-bold" : ""}`}
          >
            ADAM RIDING
          </Link>
          {/* INDEX nav item with Grid/List options */}
          <span className="relative flex flex-row items-end ">
            <Link
              href="/index-grid"
              className={`leading-none${isIndex ? " font-bold" : ""}`}
              style={{ marginRight: 4 }}
            >
              INDEX
            </Link>
            {/* Reserve space for grid/list always, but only show links when on index */}
            <span
              className="ml-1 flex flex-row items-center hidden sm:inline-flex"
              style={{
                minWidth: "90px", // enough for "- Grid, List"
                visibility: isIndex ? "visible" : "hidden",
                opacity: isIndex ? 1 : 0,
                transition: "opacity 0.2s",
              }}
            >
              <span className="text-xs text-black/40">—</span>
              <Link
                href="/index-grid"
                className={`text-xs ml-1 leading-none ${
                  isIndexGrid ? "text-black/80" : "text-black/40"
                }`}
              >
                Grid
              </Link>
              <span className="text-xs text-black/40">,</span>
              <Link
                href="/index-list"
                className={`text-xs ml-1 leading-none ${
                  isIndexList ? "text-black/80" : "text-black/40"
                }`}
              >
                List
              </Link>
            </span>
          </span>
          <Link
            href="/archive"
            className={`leading-none${isArchive ? " font-bold" : ""}`}
          >
            ARCHIVE
          </Link>
          <Link
            href="/contact"
            className={`leading-none${isContact ? " font-bold" : ""}`}
          >
            CONTACT
          </Link>
        </nav>
      </header>
    </>
  );
};

export default Navigation;
