const Index = () => {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <section className="text-center space-y-8 px-6">
        <div className="mx-auto w-40 h-40 md:w-48 md:h-48 animate-heartbeat">
          <svg
            className="w-full h-full text-love heart-glow"
            viewBox="0 0 256 256"
            aria-hidden="true"
            role="img"
          >
            <path
              d="M128 226s-14.4-12.5-28.8-25.3C69 174.8 40 149.6 40 115.6 40 89 61.2 68 87.5 68c16.6 0 29.6 9.2 40.5 23.2C138 77.2 151 68 167.6 68 194 68 216 89 216 115.6c0 34-29 59.2-59.2 85.1C142.4 213.5 128 226 128 226z"
              fill="currentColor"
            />
          </svg>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gradient-love">
          Te amo mamãe Luiza
        </h1>
        <p className="sr-only">Mensagem de amor com um coração no centro</p>
      </section>
    </main>
  );
};

export default Index;
