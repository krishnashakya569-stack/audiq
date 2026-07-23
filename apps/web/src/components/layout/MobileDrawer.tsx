"use client";

import {
  ReactNode,
  useEffect,
  useRef,
} from "react";

import {
  AnimatePresence,
  motion,
  type PanInfo,
  type Variants,
} from "framer-motion";

type MobileDrawerProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

const DRAWER_WIDTH = 340;

const drawerVariants: Variants = {
  closed: {
    x: -DRAWER_WIDTH,
    transition: {
      type: "spring",
      stiffness: 380,
      damping: 36,
      mass: 0.8,
    },
  },
  open: {
    x: 0,
    transition: {
      type: "spring",
      stiffness: 380,
      damping: 36,
      mass: 0.8,
    },
  },
};

const overlayVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
  },
};

export default function MobileDrawer({
  open,
  onClose,
  children,
}: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("keydown", handleTab);

    document.body.style.overflow = "hidden";
    window.setTimeout(() => {
      drawerRef.current
        ?.querySelector<HTMLElement>("button, a, input, [tabindex]")
        ?.focus();
    }, 0);

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
      document.removeEventListener("keydown", handleTab);

      document.body.style.overflow = "";
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (
      info.offset.x < -120 ||
      info.velocity.x < -500
    ) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}

          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={overlayVariants}
            transition={{
              duration: 0.25,
            }}
            onClick={onClose}
            aria-hidden="true"
            className="
              fixed
              inset-0
              z-40
              bg-black/70
              backdrop-blur-md
              lg:hidden
            "
          />

          {/* Drawer */}

          <motion.aside
            ref={drawerRef}
            drag="x"
            dragConstraints={{
              left: -DRAWER_WIDTH,
              right: 0,
            }}
            dragElastic={0.08}
            onDragEnd={handleDragEnd}
            initial="closed"
            animate="open"
            exit="closed"
            variants={drawerVariants}
            role="dialog"
            aria-modal="true"
            aria-label="Audiq navigation"
            className="
              fixed
              inset-y-0
              left-0
              z-50
              flex
              w-[88vw]
              max-w-[340px]
              flex-col
              overflow-hidden
              border-r
              border-white/10
              bg-[#0d0d10]/95
              backdrop-blur-2xl
              shadow-2xl
              lg:hidden
              pt-[env(safe-area-inset-top)]
              pb-[env(safe-area-inset-bottom)]
            "
          >
            {/* Drag Handle */}

            <div className="flex justify-center py-3">
              <div className="h-1.5 w-12 rounded-full bg-white/15" />
            </div>

            {/* Scrollable Content */}

            <div
              className="
                flex-1
                overflow-y-auto
                overscroll-contain
                px-2
                scrollbar-thin
                scrollbar-track-transparent
                scrollbar-thumb-white/10
              "
            >
              {children}
            </div>

            {/* Bottom Blur */}

            <div
              className="
                pointer-events-none
                absolute
                bottom-0
                left-0
                right-0
                h-12
                bg-gradient-to-t
                from-[#0d0d10]
                to-transparent
              "
            />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
