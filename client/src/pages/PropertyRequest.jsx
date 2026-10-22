import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { properties } from "../data/properties";
import { useAuth } from "../hooks/useAuth";

function PropertyRequest() {
    const [params] = useSearchParams();
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: user?.name || "",
        email: user?.email || "",
        phone: "",
        property: properties.some((item) => item.title === params.get("property")) ? params.get("property") : "",
        message: "",
    });

    const [submitted, setSubmitted] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (submitted) return;
        setSubmitted(true);
    };

    return (
        <div className="min-h-screen bg-slate-100 px-6 py-16">
            <div className="mx-auto max-w-xl rounded-xl bg-white p-8 shadow-lg">

                <h1 className="text-3xl font-bold text-slate-900">
                    Request a Property
                </h1>

                <p className="mt-2 text-slate-600">
                    Frontend demonstration only. No request is sent to an owner or saved to MongoDB.
                </p>

                {submitted ? (
                    <div role="status" className="mt-8 rounded-lg bg-green-100 p-4 text-green-700">
                        <p className="font-semibold">
                            Demo rental request completed.
                        </p>
                        <p className="mt-1 text-sm">
                            This demo stays in page memory and is cleared when you leave or reload.
                        </p>
                        <p className="mt-3 font-medium">Property: {formData.property}</p>
                        <button type="button" onClick={() => setSubmitted(false)} className="mt-4 underline">Edit demo request</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="mt-8">

                        {/* Name */}
                        <div className="mb-5">
                            <label htmlFor="request-name" className="mb-2 block font-medium text-slate-700">
                                Full Name
                            </label>

                            <input
                                type="text"
                                id="request-name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Enter your full name"
                                required
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                            />
                        </div>

                        {/* Email */}
                        <div className="mb-5">
                            <label htmlFor="request-email" className="mb-2 block font-medium text-slate-700">
                                Email
                            </label>

                            <input
                                type="email"
                                id="request-email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter your email"
                                required
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                            />
                        </div>

                        {/* Phone */}
                        <div className="mb-5">
                            <label htmlFor="request-phone" className="mb-2 block font-medium text-slate-700">
                                Phone Number
                            </label>

                            <input
                                type="tel"
                                id="request-phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="Enter your phone number"
                                required
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                            />
                        </div>

                        {/* Property */}
                        <div className="mb-5">
                            <label htmlFor="request-property" className="mb-2 block font-medium text-slate-700">
                                Property
                            </label>

                            <select
                                id="request-property"
                                name="property"
                                value={formData.property}
                                onChange={handleChange}
                                required
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                            >
                                <option value="">Select a property</option>
                                {properties.map((property) => (
                                    <option key={property.id} value={property.title}>{property.title}</option>
                                ))}
                            </select>
                        </div>

                        {/* Message */}
                        <div className="mb-6">
                            <label htmlFor="request-message" className="mb-2 block font-medium text-slate-700">
                                Message
                            </label>

                            <textarea
                                id="request-message"
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                placeholder="Enter any additional requirements..."
                                rows="4"
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
                        >
                            Complete Demo Request
                        </button>

                    </form>
                )}

            </div>
        </div>
    );
}

export default PropertyRequest;