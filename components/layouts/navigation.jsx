import Link from "next/link";
import { useRouter } from "next/router"; // Import useRouter
import { useEffect, useState } from "react";

export default function Navigation({ page }) {
  const router = useRouter();
  const [isSticky, setSticky] = useState(false);

  const handleScroll = () => {
    setSticky(window.scrollY >= 70);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Function to toggle the overview mode
  const handleOverviewClick = () => {
    const currentPath = router.asPath;
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
  };

  return (
    <>
      <header style={{ zIndex: "9999" }} className={'w-full p-4 absolute bottom-0 left-0'}
          id="mainnavigationBar">
        <nav
          className="container-fluid flex flex-row justify-between text-sm font-bold"
        >
            <div className="pointer-none leading-none">ADAM RIDING</div>
            <Link className="leading-none" href="/">INDEX</Link>
            <Link className="leading-none" href="/archive">ARCHIVE</Link>
            <Link className="leading-none" href="/contact">CONTACT</Link>
        </nav>
      </header>
    </>
  );
}
