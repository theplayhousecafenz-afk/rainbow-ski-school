export default function Footer() {
  return (
    <footer className="bg-alpine-900 text-alpine-100 py-10 mt-auto">
      <div className="max-w-6xl mx-auto px-4 text-center text-sm">
        <p className="font-semibold text-white mb-1">Rainbow Ski School</p>
        <p className="text-alpine-100 opacity-70">
          Rainbow Ski Area, St Arnaud, NZ · Meet at Mountain Clock · Lessons every Saturday &amp; Sunday
        </p>
        <p className="mt-2 opacity-70">
          <a href="mailto:snowsports@skirainbow.co.nz" className="hover:text-white transition-colors">
            snowsports@skirainbow.co.nz
          </a>
        </p>
        <p className="mt-4 opacity-50 text-xs">
          © {new Date().getFullYear()} Rainbow Ski School. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
