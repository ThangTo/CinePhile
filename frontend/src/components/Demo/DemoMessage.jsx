import React from 'react';

const DemoMessage = ({ message }) => {
  return (
    <div className="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-md flex items-center space-x-4 border border-gray-200">
      <div className="flex-shrink-0">
        {/* Icon demo */}
        <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      <div>
        <div className="text-xl font-medium text-black">Demo Component</div>
        <p className="text-gray-500">{message}</p>
      </div>
    </div>
  );
};

export default DemoMessage;
