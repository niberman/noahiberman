// Brand mark on the site ground. It used to sit on a white page, which left
// the dark site nav and footer framing a white slab.
const Logo = () => {
  return (
    <main className="flex min-h-screen w-full items-center justify-center px-[clamp(16px,4vw,56px)] pt-[76px]">
      <img
        src="/logo-full.png"
        alt="Noah Iberman Logo"
        className="ed-rise w-[min(560px,80vw)] p-8 drop-shadow-glow"
      />
    </main>
  );
};

export default Logo;
