export default function Provider() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b px-8 py-5">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <a
            href="/"
            className="text-2xl font-bold"
          >
            Master<span className="text-blue-600">App</span>
          </a>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-gray-600 hover:text-blue-600"
            >
              Home
            </a>
            <a
              href="/provider/login"
              className="bg-blue-600 text-white px-5 py-2.5 rounded-full hover:bg-blue-700"
            >
              Provider Login
            </a>
          </div>
        </div>
      </nav>
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="bg-white rounded-3xl shadow-sm border p-8 md:p-12">
          <p className="text-blue-600 font-semibold">
            MASTER APP PARTNER
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mt-3">
            Grow your business with Master App
          </h1>
          <p className="text-gray-600 text-lg mt-5 max-w-2xl">
            Register your service, reach more customers and manage your
            business from one platform.
          </p>
          {/* Benefits */}
          <div className="grid md:grid-cols-3 gap-5 mt-10">
            <div className="bg-gray-50 rounded-2xl p-5">
              <div className="text-3xl">
                👥
              </div>
              <h3 className="font-bold mt-3">
                More Customers
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                Get discovered by customers near you.
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-5">
              <div className="text-3xl">
                📈
              </div>
              <h3 className="font-bold mt-3">
                Grow Income
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                Increase your service opportunities.
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-5">
              <div className="text-3xl">
                📱
              </div>
              <h3 className="font-bold mt-3">
                Manage Easily
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                Manage bookings and customers from one place.
              </p>
            </div>
          </div>
          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-10">
            <a
              href="/provider/register"
              className="inline-flex items-center justify-center bg-blue-600 text-white px-8 py-4 rounded-full font-semibold hover:bg-blue-700 transition"
            >
              Join as a Provider
            </a>
            <a
              href="/provider/login"
              className="inline-flex items-center justify-center border border-blue-600 text-blue-600 px-8 py-4 rounded-full font-semibold hover:bg-blue-50 transition"
            >
              Provider Login
            </a>
            <a
              href="/provider/dashboard"
              className="inline-flex items-center justify-center border border-gray-300 text-gray-700 px-8 py-4 rounded-full font-semibold hover:bg-gray-50 transition"
            >
              Dashboard
            </a>
          </div>
        </div>
      </section>
      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="text-center mb-10">
          <p className="text-blue-600 font-semibold">
            HOW IT WORKS
          </p>
          <h2 className="text-3xl font-bold mt-2">
            Start earning with Master App
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white border rounded-2xl p-6">
            <div className="text-4xl font-bold text-blue-100">
              01
            </div>
            <h3 className="text-xl font-bold mt-4">
              Register
            </h3>
            <p className="text-gray-500 mt-2">
              Create your service provider profile.
            </p>
          </div>
          <div className="bg-white border rounded-2xl p-6">
            <div className="text-4xl font-bold text-blue-100">
              02
            </div>
            <h3 className="text-xl font-bold mt-4">
              Get Customers
            </h3>
            <p className="text-gray-500 mt-2">
              Customers can discover and book your services.
            </p>
          </div>
          <div className="bg-white border rounded-2xl p-6">
            <div className="text-4xl font-bold text-blue-100">
              03
            </div>
            <h3 className="text-xl font-bold mt-4">
              Complete Jobs
            </h3>
            <p className="text-gray-500 mt-2">
              Accept bookings and grow your business.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}