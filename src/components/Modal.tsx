"use client";

import { Dispatch, SetStateAction } from "react";

interface ModalProps {
  children: React.ReactNode;
  title: string;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

const Modal = ({ children, title, setOpen }: ModalProps) => {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={() => setOpen(false)}
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg z-50 w-[90%] max-w-[500px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </>
  );
};

export default Modal; 