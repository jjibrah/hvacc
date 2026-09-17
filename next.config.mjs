/** @type {import("next").NextConfig} */
const nextConfig = {
  // Type checking is an explicit prerequisite in the build script. Keeping it
  // separate avoids duplicate compiler processes and makes CI failures clearer.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
