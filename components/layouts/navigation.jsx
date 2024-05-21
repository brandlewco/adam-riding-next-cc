import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router'; // Import useRouter
import data from '../../lib/data';

export default function Navigation({ children, page }) {
  const router = useRouter(); // Initialize useRouter
  const [isSticky, setSticky] = useState(false);

  const handleScroll = () => {
    setSticky(window.scrollY >= 70);
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleClick = (event) => {
    var navbar = $('#mainnavigationBar');
    navbar.toggleClass('bg-nav');
  };

  return (
    <>
      <header>
        <nav className={`navbar navbar-expand-lg position-fixed w-100 zindex-dropdown${isSticky ? ' sticky-nav' : ''}`} id="mainnavigationBar">
          <div className="container-fluid flex flex-row justify-between w-full px-4 fixed bottom-0 mb-4 font-bold">
            <div>ADAM RIDING</div>
            <Link href="/">INDEX</Link>
            <Link href="/">ARCHIVE</Link>
            <Link href={{ pathname: router.asPath.split('?')[0], query: { overview: true } }}>OVERVIEW</Link>
          </div>
        </nav>
      </header>
    </>
  );
}
