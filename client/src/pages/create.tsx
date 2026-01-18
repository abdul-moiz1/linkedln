import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Create() {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/templates", { replace: true });
  }, [navigate]);

  return null;
}
