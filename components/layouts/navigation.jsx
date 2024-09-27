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

  // Function to toggle the overview mode
  const handleOverviewClick = useCallback(() => {
    const basePath = router.pathname;
    const newQuery = { ...router.query };

    // Toggle the 'overview' query parameter
    if (newQuery.overview) {
      delete newQuery.overview; // If overview is present, remove it
    } else {
      newQuery.overview = true; // If not present, add it
    }

    // Push the new URL with updated query parameters
    router.push({
      pathname: basePath,
      query: newQuery,
    });
  }, [router]);

  return (
    <>
      <header style={{ zIndex: "9999" }} className="w-full p-4 absolute bottom-0 left-0" id="mainnavigationBar">
        <nav className="container-fluid flex flex-row justify-between text-sm font-bold">
          <Link href="/" className="leading-none">ADAM RIDING</Link>
          <Link href="/index-list" className="leading-none">INDEX</Link>
          <Link href="/archive" className="leading-none">ARCHIVE</Link>
          <Link href="/contact" className="leading-none">CONTACT</Link>
        </nav>
      </header>
    </>
  );
};

export default Navigation;