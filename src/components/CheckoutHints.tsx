import { getCheckoutSuggestions } from "../lib/darts";
import type { CheckoutMode } from "../lib/darts";

type CheckoutHintsProps = {
  remaining: number;
  checkout: CheckoutMode;
};

export default function CheckoutHints({
  remaining,
  checkout,
}: CheckoutHintsProps) {
  const suggestions = getCheckoutSuggestions(remaining, checkout, 4);
  const max = checkout === "double-out" ? 170 : 180;

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Checkout</h3>
        <span className="badge subtle">
          {checkout === "double-out" ? "Double out" : "Straight out"}
        </span>
      </div>

      {remaining > max ? (
        <p className="muted">Za wysoko na checkout w 3 dartach.</p>
      ) : remaining < 2 ? (
        <p className="muted">Brak sensownego checkoutu.</p>
      ) : suggestions.length === 0 ? (
        <p className="muted">Brak checkoutu w 3 dartach dla tego wyniku.</p>
      ) : (
        <ul className="checkout-list">
          {suggestions.map((path, index) => (
            <li key={`${path.join("-")}-${index}`}>
              <span className="checkout-index">#{index + 1}</span>
              <span>{path.join(" • ")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}