"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
type Customer = {
  id: string;
  name: string;
  mobile: string;
  alternativeMobile?: string;
  profilePicture?: string;
  email: string;
  address: string;
  state?: string;
  city?: string;
  area?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
  createdAt?: string;
};
type PincodeResult = {
  Name?: string;
  Description?: string;
  State?: string;
  District?: string;
  Division?: string;
  Region?: string;
  Block?: string;
};
export default function CustomerAccountEditPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [alternativeMobile, setAlternativeMobile] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [pincode, setPincode] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveButtonSuccess, setSaveButtonSuccess] = useState(false);
  // Contact-change OTP verification
  const [originalMobile, setOriginalMobile] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileOtpLoading, setMobileOtpLoading] = useState(false);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  /*
   * =====================================================
   * LOAD CUSTOMER
   * =====================================================
   */
  useEffect(() => {
    const savedUser = localStorage.getItem("masterUser");
    if (!savedUser) {
      router.push("/login");
      return;
    }
    try {
      const user: Customer = JSON.parse(savedUser);
      setCustomer(user);
      setName(user.name || "");
      setMobile(user.mobile || "");
      setAlternativeMobile(user.alternativeMobile || "");
      setProfilePicture(user.profilePicture || "");
      setEmail(user.email || "");
      setOriginalMobile(user.mobile || "");
      setOriginalEmail((user.email || "").trim().toLowerCase());
      setMobileVerified(true);
      setEmailVerified(true);
      setAddress(user.address || "");
      setState(user.state || "");
      setCity(user.city || "");
      setArea(user.area || "");
      setPincode(user.pincode || "");
      setLatitude(
        typeof user.latitude === "number"
          ? user.latitude
          : null
      );
      setLongitude(
        typeof user.longitude === "number"
          ? user.longitude
          : null
      );
    } catch {
      localStorage.removeItem("masterUser");
      localStorage.removeItem("masterUserMobile");
      router.push("/login");
    }
  }, [router]);
  /*
   * =====================================================
   * PINCODE → STATE + CITY + AREA
   * =====================================================
   */
  const lookupPincode = async (pin: string) => {
    const cleanPin = pin
      .replace(/\D/g, "")
      .slice(0, 6);
    setPincode(cleanPin);
    setError("");
    setSuccess("");
    if (cleanPin.length !== 6) {
      return;
    }
    setPincodeLoading(true);
    try {
      const response = await fetch(
        `https://api.postalpincode.in/pincode/${cleanPin}`
      );
      if (!response.ok) {
        throw new Error(
          "Pincode service unavailable."
        );
      }
      const result = await response.json();
      if (
        !Array.isArray(result) ||
        !result[0] ||
        result[0].Status !== "Success" ||
        !Array.isArray(result[0].PostOffice) ||
        result[0].PostOffice.length === 0
      ) {
        setError(
          "Invalid pincode or location not found."
        );
        return;
      }
      const postOffices: PincodeResult[] =
        result[0].PostOffice;
      /*
       * India Post:
       * District = City/District
       * Name = Area/Post Office
       */
      const firstOffice = postOffices[0];
      const detectedState =
        firstOffice.State?.trim() || "";
      const detectedCity =
        firstOffice.District?.trim() || "";
      const detectedArea =
        firstOffice.Name?.trim() || "";
      setState(detectedState);
      setCity(detectedCity);
      setArea(detectedArea);
      setSuccess(
        `Location found: ${detectedArea}, ${detectedCity}, ${detectedState}`
      );
    } catch (lookupError) {
      console.error(
        "Pincode lookup error:",
        lookupError
      );
      setError(
        "Unable to find this pincode right now. Please try again."
      );
    } finally {
      setPincodeLoading(false);
    }
  };
  /*
   * =====================================================
   * CURRENT LOCATION → GPS → ADDRESS
   * =====================================================
   */
  const handleGetCurrentLocation = () => {
    setError("");
    setSuccess("");
    if (!navigator.geolocation) {
      setError(
        "Your browser does not support location services."
      );
      return;
    }
    setLocationLoading(true);
    let bestPosition: GeolocationPosition | null = null;
    let finished = false;
    let watchId: number | null = null;
    let timeoutId: number | null = null;
    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
    const finishWithPosition = async (
      position: GeolocationPosition
    ) => {
      if (finished) return;
      finished = true;
      cleanup();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;
      /*
       * Do not accept a very coarse Chrome/Windows
       * Wi-Fi/IP location as the user's real location.
       */
      if (
        !Number.isFinite(accuracy) ||
        accuracy > 3000
      ) {
        setLatitude(null);
        setLongitude(null);
        setLocationLoading(false);
        setError(
          `Your device returned an approximate location with about ${Math.round(
            accuracy || 0
          )} m accuracy. Please turn ON Precise Location for Windows/Chrome and try again.`
        );
        return;
      }
      setLatitude(lat);
      setLongitude(lng);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
            lat
          )}&lon=${encodeURIComponent(
            lng
          )}&zoom=18&addressdetails=1`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );
        if (!response.ok) {
          throw new Error(
            "Reverse geocoding failed."
          );
        }
        const data = await response.json();
        const location = data?.address || {};
        const detectedState =
          location.state ||
          location.state_district ||
          "";
        const detectedCity =
          location.city ||
          location.town ||
          location.municipality ||
          location.city_district ||
          location.village ||
          "";
        const detectedArea =
          location.suburb ||
          location.neighbourhood ||
          location.hamlet ||
          location.quarter ||
          "";
        const detectedPincode = String(
          location.postcode || ""
        )
          .replace(/\D/g, "")
          .slice(0, 6);
        setState(detectedState);
        setCity(detectedCity);
        setArea(detectedArea);
        if (detectedPincode) {
          setPincode(detectedPincode);
        }
        const detectedAddress = [
          location.house_number,
          location.road,
          detectedArea,
          detectedCity,
        ]
          .filter(Boolean)
          .join(", ");
        if (detectedAddress) {
          setAddress((currentAddress) =>
            currentAddress.trim()
              ? currentAddress
              : detectedAddress
          );
        }
        const locationText = [
          detectedArea,
          detectedCity,
          detectedState,
          detectedPincode,
        ]
          .filter(Boolean)
          .join(", ");
        setSuccess(
          locationText
            ? `Current location detected: ${locationText}. GPS accuracy: approximately ${Math.round(
                accuracy
              )} m. Please verify and save.`
            : `GPS location detected. Accuracy: approximately ${Math.round(
                accuracy
              )} m. Please verify and save.`
        );
      } catch (reverseError) {
        console.error(
          "Customer reverse geocoding error:",
          reverseError
        );
        setSuccess(
          `GPS location detected at ${lat.toFixed(
            6
          )}, ${lng.toFixed(
            6
          )}. Address lookup failed. Accuracy: approximately ${Math.round(
            accuracy
          )} m. Please enter your address manually.`
        );
      } finally {
        setLocationLoading(false);
      }
    };
    const onPosition = (
      position: GeolocationPosition
    ) => {
      if (
        !bestPosition ||
        position.coords.accuracy <
          bestPosition.coords.accuracy
      ) {
        bestPosition = position;
      }
      if (
        position.coords.accuracy <= 100
      ) {
        void finishWithPosition(
          position
        );
      }
    };
    const onError = (
      locationError: GeolocationPositionError
    ) => {
      console.error(
        "Customer location error:",
        locationError
      );
      if (finished) return;
      if (locationError.code === 1) {
        finished = true;
        cleanup();
        setLocationLoading(false);
        setError(
          "Location permission was denied. Please allow location access for localhost in Chrome."
        );
      }
    };
    watchId =
      navigator.geolocation.watchPosition(
        onPosition,
        onError,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    navigator.geolocation.getCurrentPosition(
      onPosition,
      onError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
    timeoutId = window.setTimeout(() => {
      if (finished) return;
      if (bestPosition) {
        void finishWithPosition(
          bestPosition
        );
        return;
      }
      finished = true;
      cleanup();
      setLocationLoading(false);
      setError(
        "Your current location could not be detected. Please check Windows/Chrome location permission and try again."
      );
    }, 15000);
  };
  /*
   * =====================================================
   * CONTACT CHANGE OTP VERIFICATION
   * =====================================================
   * The current app uses the same demo OTP flow as login.
   * Demo OTP: 123456
   * Real SMS/email delivery can be connected later.
   */
  const handleMobileChange = (value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 10);
    setMobile(cleanValue);
    setError("");
    setSuccess("");
    if (cleanValue === originalMobile) {
      setMobileVerified(true);
      setMobileOtpSent(false);
      setMobileOtp("");
    } else {
      setMobileVerified(false);
      setMobileOtpSent(false);
      setMobileOtp("");
    }
  };
  const handleEmailChange = (value: string) => {
    const cleanValue = value.trimStart();
    setEmail(cleanValue);
    setError("");
    setSuccess("");
    if (cleanValue.trim().toLowerCase() === originalEmail) {
      setEmailVerified(true);
      setEmailOtpSent(false);
      setEmailOtp("");
    } else {
      setEmailVerified(false);
      setEmailOtpSent(false);
      setEmailOtp("");
    }
  };
  const sendMobileOtp = async () => {
    const cleanMobile = mobile.trim();
    setError("");
    setSuccess("");
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setError("Please enter a valid 10-digit Indian mobile number first.");
      return;
    }
    setMobileOtpLoading(true);
    try {
      setMobileOtp("");
      setMobileOtpSent(true);
      setMobileVerified(false);
      setSuccess("Demo OTP sent to the new mobile number. Use OTP: 123456");
    } finally {
      setMobileOtpLoading(false);
    }
  };
  const verifyMobileOtp = () => {
    const cleanOtp = mobileOtp.replace(/\D/g, "").slice(0, 6);
    setError("");
    setSuccess("");
    if (!mobileOtpSent) {
      setError("Please send OTP to the new mobile number first.");
      return;
    }
    if (cleanOtp !== "123456") {
      setMobileVerified(false);
      setError("Invalid OTP. Please enter 123456.");
      return;
    }
    setMobileVerified(true);
    setMobileOtpSent(false);
    setMobileOtp("");
    setSuccess("New mobile number verified successfully.");
  };
  const sendEmailOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    setError("");
    setSuccess("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address first.");
      return;
    }
    setEmailOtpLoading(true);
    try {
      setEmailOtp("");
      setEmailOtpSent(true);
      setEmailVerified(false);
      setSuccess("Demo OTP sent to the new email address. Use OTP: 123456");
    } finally {
      setEmailOtpLoading(false);
    }
  };
  const verifyEmailOtp = () => {
    const cleanOtp = emailOtp.replace(/\D/g, "").slice(0, 6);
    setError("");
    setSuccess("");
    if (!emailOtpSent) {
      setError("Please send OTP to the new email address first.");
      return;
    }
    if (cleanOtp !== "123456") {
      setEmailVerified(false);
      setError("Invalid OTP. Please enter 123456.");
      return;
    }
    setEmailVerified(true);
    setEmailOtpSent(false);
    setEmailOtp("");
    setSuccess("New email address verified successfully.");
  };
  /*
   * =====================================================
   * PROFILE PICTURE
   * =====================================================
   * Customer profile picture is stored in the current
   * customer session/localStorage so it works with the
   * existing Master App frontend architecture.
   *
   * The image is resized before saving to keep localStorage
   * usage small.
   */
  const handleProfilePictureChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Profile picture must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    setError("");
    setSuccess("");
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 500;
        let width = image.width;
        let height = image.height;
        if (width > height && width > maxSize) {
          height = Math.round(
            (height * maxSize) / width
          );
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round(
            (width * maxSize) / height
          );
          height = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          setError("Unable to process this image. Please try another image.");
          return;
        }
        context.drawImage(
          image,
          0,
          0,
          width,
          height
        );
        const compressedImage = canvas.toDataURL(
          "image/jpeg",
          0.82
        );
        setProfilePicture(compressedImage);
        setSuccess("Profile picture selected. Click Save Changes to save it.");
      };
      image.onerror = () => {
        setError("Unable to read this image. Please try another image.");
      };
      image.src = String(reader.result);
    };
    reader.onerror = () => {
      setError("Unable to read this image. Please try again.");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };
  const removeProfilePicture = () => {
    setProfilePicture("");
    setError("");
    setSuccess("Profile picture will be removed when you save the changes.");
  };
  /*
   * =====================================================
   * SAVE CUSTOMER
   * =====================================================
   */
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const cleanName = name.trim();
    const cleanMobile = mobile.trim();
    const cleanAlternativeMobile = alternativeMobile.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanAddress = address.trim();
    const cleanState = state.trim();
    const cleanCity = city.trim();
    const cleanArea = area.trim();
    const cleanPincode = pincode.trim();
    /*
     * VALIDATION
     */
    if (!cleanName) {
      setError("Please enter your name.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setError(
        "Please enter a valid 10-digit Indian mobile number."
      );
      return;
    }
    if (
      cleanAlternativeMobile &&
      !/^[6-9]\d{9}$/.test(cleanAlternativeMobile)
    ) {
      setError(
        "Please enter a valid 10-digit Indian alternative mobile number."
      );
      return;
    }
    if (
      cleanAlternativeMobile &&
      cleanAlternativeMobile === cleanMobile
    ) {
      setError(
        "Alternative mobile number must be different from the primary mobile number."
      );
      return;
    }
    if (
      cleanEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        cleanEmail
      )
    ) {
      setError(
        "Please enter a valid email address."
      );
      return;
    }
    if (!cleanState) {
      setError("Please enter your state.");
      return;
    }
    if (!cleanCity) {
      setError("Please enter your city.");
      return;
    }
    if (!cleanArea) {
      setError(
        "Please enter your area/locality."
      );
      return;
    }
    if (!/^\d{6}$/.test(cleanPincode)) {
      setError(
        "Please enter a valid 6-digit pincode."
      );
      return;
    }
    if (!customer) {
      setError("Customer account not found.");
      return;
    }
    if (cleanMobile !== originalMobile && !mobileVerified) {
      setError("Please verify the new mobile number with OTP before saving.");
      return;
    }
    if (cleanEmail !== originalEmail && !emailVerified) {
      setError("Please verify the new email address with OTP before saving.");
      return;
    }
    setSaving(true);
    try {
      /*
       * =====================================================
       * UPDATED CUSTOMER OBJECT
       * =====================================================
       */
      const updatedCustomer: Customer = {
        ...customer,
        name: cleanName,
        mobile: cleanMobile,
        alternativeMobile: cleanAlternativeMobile,
        profilePicture,
        email: cleanEmail,
        address: cleanAddress,
        state: cleanState,
        city: cleanCity,
        area: cleanArea,
        pincode: cleanPincode,
        latitude,
        longitude,
      };
      /*
       * =====================================================
       * 1. UPDATE SUPABASE
       * =====================================================
       */
      try {
        const { error: supabaseUpdateError } = await supabase
          .from("customers")
          .update({
            name: cleanName,
            mobile: cleanMobile,
            alternative_mobile: cleanAlternativeMobile || null,
            email: cleanEmail,
            address: cleanAddress,
            state: cleanState,
            city: cleanCity,
            area: cleanArea,
            pincode: cleanPincode,
            latitude,
            longitude,
          })
          .eq("id", customer.id);

        if (supabaseUpdateError) {
          console.warn(
            "Customer Supabase update warning, proceeding with local fallback:",
            supabaseUpdateError
          );
        }
      } catch (err) {
        console.warn("Network or Supabase exception during profile update:", err);
      }
      /*
       * =====================================================
       * 2. CURRENT CUSTOMER SESSION
       * =====================================================
       */
      localStorage.setItem(
        "masterUser",
        JSON.stringify(updatedCustomer)
      );
      /*
       * =====================================================
       * 3. CURRENT MOBILE
       * =====================================================
       */
      localStorage.setItem(
        "masterUserMobile",
        cleanMobile
      );
      /*
       * =====================================================
       * 4. LOCAL MASTER CUSTOMERS
       * =====================================================
       */
      const savedCustomers =
        localStorage.getItem(
          "masterCustomers"
        );
      let customers: Customer[] = [];
      if (savedCustomers) {
        try {
          customers = JSON.parse(
            savedCustomers
          );
        } catch {
          customers = [];
        }
      }
      const customerExists =
        customers.some(
          (item) =>
            String(item.id) ===
            String(customer.id)
        );
      let updatedCustomers: Customer[];
      if (customerExists) {
        updatedCustomers =
          customers.map((item) =>
            String(item.id) ===
            String(customer.id)
              ? updatedCustomer
              : item
          );
      } else {
        updatedCustomers = [
          ...customers,
          updatedCustomer,
        ];
      }
      localStorage.setItem(
        "masterCustomers",
        JSON.stringify(updatedCustomers)
      );
      /*
       * =====================================================
       * 5. UPDATE EXISTING LOCAL BOOKINGS
       * =====================================================
       */
      const savedBookings =
        localStorage.getItem(
          "masterBookings"
        );
      if (savedBookings) {
        try {
          const bookings =
            JSON.parse(savedBookings);
          const updatedBookings =
            bookings.map(
              (booking: {
                customerId: string;
                name?: string;
                mobile?: string;
                address?: string;
                state?: string;
                city?: string;
                area?: string;
                pincode?: string;
                customerLatitude?: number | null;
                customerLongitude?: number | null;
              }) => {
                if (
                  String(
                    booking.customerId
                  ) !==
                  String(customer.id)
                ) {
                  return booking;
                }
                return {
                  ...booking,
                  name: cleanName,
                  mobile: cleanMobile,
                  address: cleanAddress,
                  state: cleanState,
                  city: cleanCity,
                  area: cleanArea,
                  pincode: cleanPincode,
                  customerLatitude:
                    latitude,
                  customerLongitude:
                    longitude,
                };
              }
            );
          localStorage.setItem(
            "masterBookings",
            JSON.stringify(updatedBookings)
          );
        } catch {
          /*
           * Ignore invalid booking data.
           */
        }
      }
      /*
       * =====================================================
       * 6. UPDATE LOCAL STATE
       * =====================================================
       */
      setCustomer(updatedCustomer);
      /*
       * =====================================================
       * 7. NOTIFY COMPONENTS
       * =====================================================
       */
      window.dispatchEvent(
        new Event(
          "master-customer-updated"
        )
      );
      window.dispatchEvent(
        new Event(
          "master-auth-updated"
        )
      );
      window.dispatchEvent(
        new Event(
          "master-bookings-updated"
        )
      );
      /*
       * =====================================================
       * SUCCESS
       * =====================================================
       */
      setSuccess(
        "Your account and location have been updated successfully."
      );
      // Show "Saved Successfully" on the save button, then scroll to the
      // success message at the top of the page.
      setSaveButtonSuccess(true);
      window.setTimeout(() => {
        setSaveButtonSuccess(false);
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }, 1000);
    } catch (updateError) {
      console.error(
        "Customer account update error:",
        updateError
      );
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Something went wrong while saving your account."
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/account"
          className="text-sm font-semibold text-blue-600 hover:underline"
        >
          ← Back to My Account
        </Link>
        <div className="mt-4 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              Customer Account
            </p>
            <h1 className="mt-1 text-3xl font-bold text-gray-900">
              Edit Profile
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Update your personal information and service
              location.
            </p>
          </div>
          {/* SUCCESS MESSAGE — shown at the top */}
          {success && (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
              ✓ {success}
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >
            {/* CUSTOMER ID */}
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Customer ID
              </p>
              <p className="mt-1 font-bold text-gray-800">
                {customer?.id || "-"}
              </p>
            </div>
            {/* PROFILE PICTURE */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <div className="flex flex-col items-center gap-5 sm:flex-row">
                <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-blue-100 shadow-md">
                  {profilePicture ? (
                    <img
                      src={profilePicture}
                      alt="Customer profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl">👤</span>
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm font-bold text-blue-900">
                    Profile Picture
                  </p>
                  <p className="mt-1 text-xs leading-5 text-blue-700">
                    Add a profile picture so providers and Admin
                    can easily recognize your account.
                  </p>
                  <div className="mt-3 flex flex-col justify-center gap-2 sm:flex-row sm:justify-start">
                    <label className="cursor-pointer rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
                      📷 {profilePicture ? "Change Picture" : "Upload Picture"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureChange}
                        className="hidden"
                      />
                    </label>
                    {profilePicture && (
                      <button
                        type="button"
                        onClick={removeProfilePicture}
                        className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50"
                      >
                        🗑️ Remove
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-gray-500">
                    JPG, PNG or other image • Maximum 5 MB
                  </p>
                </div>
              </div>
            </div>
            {/* NAME */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="Enter your full name"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            {/* MOBILE */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Mobile Number
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => handleMobileChange(e.target.value)}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                {mobile.trim() === originalMobile ? (
                  <div className="flex items-center justify-center rounded-xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
                    ✓ Verified
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void sendMobileOtp()}
                    disabled={mobileOtpLoading}
                    className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {mobileOtpLoading ? "Sending..." : "Send OTP"}
                  </button>
                )}
              </div>
              {mobile.trim() !== originalMobile && (
                <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <p className="text-xs font-semibold text-blue-800">
                    Verify new mobile number
                  </p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={mobileOtp}
                      onChange={(e) =>
                        setMobileOtp(
                          e.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      placeholder="Enter 6-digit OTP"
                      className="flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={verifyMobileOtp}
                      disabled={!mobileOtpSent}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Verify OTP
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-blue-600">
                    Demo OTP: 123456
                  </p>
                  {mobileVerified && (
                    <p className="mt-1 text-xs font-bold text-green-700">
                      ✓ New mobile number verified
                    </p>
                  )}
                </div>
              )}
              <p className="mt-1 text-xs text-gray-400">
                This number is used for login and booking contact. Changing it requires OTP verification.
              </p>
            </div>
            {/* ALTERNATIVE MOBILE */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Alternative Mobile Number
              </label>
              <input
                type="tel"
                value={alternativeMobile}
                onChange={(e) =>
                  setAlternativeMobile(
                    e.target.value.replace(/\D/g, "").slice(0, 10)
                  )
                }
                maxLength={10}
                inputMode="numeric"
                placeholder="Optional 10-digit alternative number"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-1 text-xs text-gray-500">
                Optional. No OTP verification is required for this number.
              </p>
            </div>
            {/* EMAIL */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Email Address
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                {email.trim().toLowerCase() === originalEmail ? (
                  <div className="flex items-center justify-center rounded-xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
                    ✓ Verified
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void sendEmailOtp()}
                    disabled={emailOtpLoading}
                    className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {emailOtpLoading ? "Sending..." : "Send OTP"}
                  </button>
                )}
              </div>
              {email.trim().toLowerCase() !== originalEmail && (
                <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <p className="text-xs font-semibold text-blue-800">
                    Verify new email address
                  </p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={emailOtp}
                      onChange={(e) =>
                        setEmailOtp(
                          e.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      placeholder="Enter 6-digit OTP"
                      className="flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={verifyEmailOtp}
                      disabled={!emailOtpSent}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Verify OTP
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-blue-600">
                    Demo OTP: 123456
                  </p>
                  {emailVerified && (
                    <p className="mt-1 text-xs font-bold text-green-700">
                      ✓ New email address verified
                    </p>
                  )}
                </div>
              )}
            </div>
            {/* LOCATION */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-blue-900">
                    📍 Your Service Location
                  </p>
                  <p className="mt-1 text-xs leading-5 text-blue-700">
                    Enter your pincode or use your current
                    location. Area, city and state will be
                    detected automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={
                    handleGetCurrentLocation
                  }
                  disabled={locationLoading}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {locationLoading
                    ? "Detecting..."
                    : "📍 Use My Current Location"}
                </button>
              </div>
              {/* PINCODE */}
              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Pincode
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pincode}
                    onChange={(e) =>
                      lookupPincode(
                        e.target.value
                      )
                    }
                    placeholder="Enter 6-digit pincode"
                    maxLength={6}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-32 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  {pincodeLoading && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-600">
                      Finding...
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Enter your pincode to automatically
                  detect State, City and Area.
                </p>
              </div>
              {/* STATE */}
              <div className="mt-4">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  State
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) =>
                    setState(e.target.value)
                  }
                  placeholder="State"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              {/* CITY */}
              <div className="mt-4">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  City / District
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) =>
                    setCity(e.target.value)
                  }
                  placeholder="City / District"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              {/* AREA */}
              <div className="mt-4">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Area / Locality
                </label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) =>
                    setArea(e.target.value)
                  }
                  placeholder="Area / Locality / Village"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Example: Harina, Bank More, Saraidhela,
                  Katras etc.
                </p>
              </div>
              {/* LOCATION PREVIEW */}
              <div className="mt-5 rounded-xl bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Saved Location
                </p>
                <div className="mt-3 space-y-1 text-sm">
                  {area && (
                    <p>
                      <span className="font-semibold text-gray-700">
                        Area:
                      </span>{" "}
                      {area}
                    </p>
                  )}
                  {city && (
                    <p>
                      <span className="font-semibold text-gray-700">
                        City:
                      </span>{" "}
                      {city}
                    </p>
                  )}
                  {state && (
                    <p>
                      <span className="font-semibold text-gray-700">
                        State:
                      </span>{" "}
                      {state}
                    </p>
                  )}
                  {pincode && (
                    <p>
                      <span className="font-semibold text-gray-700">
                        Pincode:
                      </span>{" "}
                      {pincode}
                    </p>
                  )}
                </div>
              </div>
              {/* GPS */}
              <div className="mt-4 rounded-xl bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  GPS Location
                </p>
                {latitude !== null &&
                longitude !== null ? (
                  <div className="mt-2">
                    <p className="text-sm font-semibold text-green-700">
                      🟢 Location detected
                    </p>
                    <p className="mt-1 break-all text-xs text-gray-500">
                      Latitude:{" "}
                      {latitude.toFixed(6)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Longitude:{" "}
                      {longitude.toFixed(6)}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">
                    GPS location not detected yet.
                  </p>
                )}
              </div>
            </div>
            {/* ADDRESS */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Full Address
              </label>
              <textarea
                value={address}
                onChange={(e) =>
                  setAddress(e.target.value)
                }
                rows={4}
                placeholder="House / Flat No., Street, Area, Landmark..."
                className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-1 text-xs text-gray-400">
                Your detailed address can be shared with the
                provider after booking.
              </p>
            </div>
            {/* ERROR */}
            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}
            {/* BUTTONS */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : saveButtonSuccess
                    ? "Saved Successfully"
                    : "Save Changes"}
              </button>
              <Link
                href="/account"
                className="rounded-xl border border-gray-300 px-6 py-3 text-center font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
        {/* LOCATION INFORMATION */}
        <div className="mt-5 rounded-2xl bg-green-50 p-5">
          <h3 className="font-bold text-green-900">
            📍 Location-Based Services
          </h3>
          <p className="mt-1 text-sm leading-6 text-green-700">
            Master App will use your saved area, city,
            pincode and GPS coordinates to find service
            providers near your location.
          </p>
        </div>
        {/* SYNC INFORMATION */}
        <div className="mt-5 rounded-2xl bg-blue-50 p-5">
          <h3 className="font-bold text-blue-900">
            🔄 Account Sync
          </h3>
          <p className="mt-1 text-sm leading-6 text-blue-700">
            Your updated customer information will also be
            reflected in your existing bookings and the Admin
            Customer panel.
          </p>
        </div>
      </div>
    </main>
  );
}