import React from 'react';
import { FaSignOutAlt } from 'react-icons/fa';

const SignOutButton = ({ variant = 'desktop', onSignOut }) => {
  const baseClasses = 'w-full text-left flex items-center transition-colors';
  const styles =
    variant === 'desktop'
      ? 'px-4 py-2.5 text-sm text-[#ffff] hover:bg-[#ffff]/20 hover:text-[#ffff]'
      : 'px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100';

  return (
    <button onClick={onSignOut} className={`${baseClasses} ${styles}`}>
      <FaSignOutAlt className="mr-2" />
      Sign out
    </button>
  );
};

export default SignOutButton;
