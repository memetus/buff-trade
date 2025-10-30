"use client";
import React, { useState, useCallback, useRef } from "react";
import Image from "next/image";
import styles from "./LoginFlowModal.module.scss";
import classNames from "classnames/bind";
import { useOnClick } from "@/shared/hooks/useOnClick";
import BaseModal from "@/components/base/baseModal/BaseModal";
import CloseIcon from "@/public/icons/close.svg";
import ArrowLeftIcon from "@/public/icons/arrow-left.svg";
import ArrowRightIcon from "@/public/icons/arrow-right.svg";

const cx = classNames.bind(styles);

interface LoginFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface LoginFlowStep {
  title: string;
  description: string;
  image: string;
  content?: React.ReactNode;
}

const LoginFlowModal = ({
  isOpen,
  onClose,
  onComplete,
}: LoginFlowModalProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useOnClick({
    ref,
    handler: () => handleClose(),
    mouseEvent: "click",
  });

  const handleNext = useCallback(() => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      // Last step - complete the flow
      if (onComplete) {
        onComplete();
      } else {
        handleClose();
      }
    }
  }, [currentStep, handleClose, onComplete]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const steps: LoginFlowStep[] = [
    {
      title: "Create a token with agents",
      description:
        "Launch your token with a trading agent. Pay 0.2 SOL to start your \ntrading agent and boost your graduation chance.",
      image: "/images/Tutorial_content1.png",
    },
    {
      title: "Share your agents progress",
      description:
        "Share the top trades, recent buys and sells to build token \nnarrative and community.",
      image: "/images/Tutorial_content2.png",
    },
    {
      title: "Buy tokens",
      description:
        "Share the top trades, recent buys and sells to build token \nnarrative and community",
      image: "/images/Tutorial_content3.png",
    },
  ];

  if (!isOpen) {
    return null;
  }

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === 2;

  return (
    <BaseModal>
      <div className={cx("modal-container")}>
        <section className={cx("modal")} ref={ref}>
          <div className={cx("modal-head")}>
            <h3 className={cx("modal-title")}>{currentStepData.title}</h3>
            <button
              className={cx("close-button")}
              aria-label="close-button"
              onClick={handleClose}
            >
              <CloseIcon
                viewBox="0 0 24 24"
                className={cx("close-button-icon")}
              />
            </button>
          </div>

          <div className={cx("modal-body")}>
            <p className={cx("modal-description")}>
              {currentStepData.description}
            </p>

            <div className={cx("tutorial-content")}>
              <Image
                src={currentStepData.image}
                alt={`Tutorial ${currentStep + 1}`}
                width={492}
                height={332}
                priority
              />
            </div>
          </div>

          <div className={cx("modal-footer")}>
            <div className={cx("step-indicators")}>
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={cx("step-indicator", {
                    active: index === currentStep,
                  })}
                />
              ))}
            </div>

            <div className={cx("navigation-buttons")}>
              <button
                className={cx("nav-button", "back-button")}
                onClick={handleBack}
                disabled={isFirstStep}
              >
                Back
              </button>

              <button
                className={cx("nav-button", "next-button")}
                onClick={handleNext}
              >
                {isLastStep ? "Close" : "Next"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </BaseModal>
  );
};

export default LoginFlowModal;
