import React, { useState } from "react";
import useToast from "hooks/useToast";
import ToastContainer from "components/common/ToastContainer";
import PasswordChangeModal from "./PasswordChangeModal";
import { cardStyles, buttonStyles } from "./shared-styles";
// import EmailChangeModal from "./EmailChangeModal";

const SecurityCard = ({ user }) => {
  // const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const { toasts, removeToast, success, error } = useToast();

  // Check if user logged in via Google
  // User đăng nhập bằng Google nếu có googleId
  // Nếu user có googleId nhưng không có password (hoặc password rỗng) thì ẩn mục mật khẩu
  const isGoogleLogin = !!user?.googleId;

  return (
    <>
      <div className={cardStyles.container}>
        <div className={cardStyles.header}>
          <h2 className={cardStyles.headerTitle}>Bảo mật & Đăng nhập</h2>
        </div>
        <div className={cardStyles.body}>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center items-start gap-3 py-4 border-b border-account-border first:pt-0 last:border-b-0 last:pb-0">
            <div>
              <div className="text-base font-medium text-account-text-primary mb-1">Email</div>
              <div className="text-sm text-account-text-secondary">{user.email}</div>
            </div>
            {/* <button
              className={`${buttonStyles.base} ${buttonStyles.secondary} w-full md:w-auto`}
              onClick={() => setShowEmailModal(true)}
            >
              Thay đổi
            </button> */}
          </div>
          {!isGoogleLogin && (
            <div className="flex flex-col md:flex-row md:justify-between md:items-center items-start gap-3 py-4 border-b border-account-border first:pt-0 last:border-b-0 last:pb-0">
              <div>
                <div className="text-base font-medium text-account-text-primary mb-1">Mật khẩu</div>
                <div className="text-sm text-account-text-secondary">••••••••</div>
              </div>
              <button
                className={`${buttonStyles.base} ${buttonStyles.secondary} w-full md:w-auto`}
                onClick={() => setShowPasswordModal(true)}
              >
                Thay đổi
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Email Change Modal */}
      {/* {showEmailModal && (
        <EmailChangeModal
          currentEmail={user.email}
          onClose={() => setShowEmailModal(false)}
          onSuccess={success}
        />
      )} */}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <PasswordChangeModal
          onClose={() => setShowPasswordModal(false)}
          onSuccess={success}
          onError={error}
        />
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
};

export default SecurityCard;
